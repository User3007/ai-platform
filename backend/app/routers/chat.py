import json
from collections.abc import AsyncGenerator
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AuthenticationError, OpenAIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.model_config import ModelConfig
from app.models.system_prompt_history import SystemPromptHistory
from app.schemas.message import SendMessageRequest
from app.services.chat_service import get_global_system_prompt, prepend_context_message, prepend_system_prompt, stream_chat_response
from app.services.rag_service import retrieve_rag_context
from app.services.search_service import search_web

router = APIRouter()


async def event_stream(
    db: AsyncSession,
    conversation: Conversation,
    payload: SendMessageRequest,
    chat_messages: list[dict[str, str]],
    model: ModelConfig,
    search_results: list[dict[str, str]] | None = None,
    rag_results: list[dict[str, str | int | float | None]] | None = None,
) -> AsyncGenerator[str, None]:
    yield f"data: {json.dumps({'type': 'metadata', 'phase': 'start'})}\n\n"
    if payload.use_rag:
        yield f"data: {json.dumps({'type': 'citations', 'source': 'rag', 'results': rag_results or []})}\n\n"
    if payload.use_search:
        yield f"data: {json.dumps({'type': 'citations', 'source': 'search', 'results': search_results or []})}\n\n"

    assistant_chunks: list[str] = []
    tokens_used: int | None = None

    try:
        async for event in stream_chat_response(chat_messages, model):
            if event["type"] == "message_delta":
                delta = event.get("delta", "")
                if delta:
                    assistant_chunks.append(delta)
                    yield f"data: {json.dumps({'type': 'message_delta', 'delta': delta})}\n\n"
                continue

            if event["type"] == "completion":
                final_content = (event.get("content") or "").strip() or ''.join(assistant_chunks).strip() or 'No response received.'
                tokens_used = event.get("tokens_used")
                assistant_message = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=final_content,
                    tokens_used=tokens_used,
                )
                db.add(assistant_message)
                conversation.updated_at = datetime.utcnow()
                await db.commit()
                yield f"data: {json.dumps({'type': 'completion', 'message_id': str(assistant_message.id), 'content': final_content, 'tokens_used': tokens_used})}\n\n"
                return

        final_content = ''.join(assistant_chunks).strip() or 'No response received.'
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=final_content,
            tokens_used=tokens_used,
        )
        db.add(assistant_message)
        conversation.updated_at = datetime.utcnow()
        await db.commit()
        yield f"data: {json.dumps({'type': 'completion', 'message_id': str(assistant_message.id), 'content': final_content, 'tokens_used': tokens_used})}\n\n"
    except ValueError as exc:
        await db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"
    except AuthenticationError:
        await db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'detail': 'Model provider authentication failed. Check the configured API key and endpoint.'})}\n\n"
    except OpenAIError as exc:
        await db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'detail': f'Model provider request failed: {exc}'})}\n\n"
    except Exception as exc:
        await db.rollback()
        yield f"data: {json.dumps({'type': 'error', 'detail': f'Unexpected streaming error: {exc}'})}\n\n"


@router.post("/{conv_id}/send")
async def send_message(
    conv_id: str,
    payload: SendMessageRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == UUID(conv_id), Conversation.user_id == user.id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    model = None
    if conversation.model_id:
        model_result = await db.execute(select(ModelConfig).where(ModelConfig.id == conversation.model_id, ModelConfig.is_active.is_(True)))
        model = model_result.scalar_one_or_none()

    if model is None:
        model_result = await db.execute(
            select(ModelConfig).where(ModelConfig.is_active.is_(True)).order_by(ModelConfig.created_at.asc())
        )
        model = model_result.scalars().first()

    if model is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active model configured")

    search_results: list[dict[str, str]] | None = None
    rag_results: list[dict[str, str | int | float | None]] | None = None
    rag_context: str | None = None
    if payload.use_search:
        try:
            search_results = await search_web(payload.content)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Search provider request failed: {exc}") from exc

    if payload.use_rag:
        try:
            rag_results, rag_context = await retrieve_rag_context(db, payload.content)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"RAG retrieval failed: {exc}") from exc

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=payload.content,
        search_results=search_results,
    )
    db.add(user_message)
    await db.flush()

    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    history_messages = history_result.scalars().all()

    chat_messages = [
        {
            "role": message.role,
            "content": message.content,
            "search_results": message.search_results,
        }
        for message in history_messages
        if message.role in {"user", "assistant", "system"} and message.content
    ]
    chat_messages = prepend_context_message(chat_messages, rag_context)
    system_prompt = await get_global_system_prompt(db)
    normalized_system_prompt = system_prompt.strip()
    if normalized_system_prompt:
        prompt_history_result = await db.execute(
            select(SystemPromptHistory)
            .where(SystemPromptHistory.conversation_id == conversation.id)
            .order_by(SystemPromptHistory.created_at.desc())
            .limit(1)
        )
        latest_prompt_history = prompt_history_result.scalar_one_or_none()
        if latest_prompt_history is None or latest_prompt_history.prompt_text.strip() != normalized_system_prompt:
            db.add(
                SystemPromptHistory(
                    conversation_id=conversation.id,
                    prompt_text=normalized_system_prompt,
                )
            )
            await db.flush()

    chat_messages = prepend_system_prompt(chat_messages, system_prompt)

    return StreamingResponse(
        event_stream(db, conversation, payload, chat_messages, model, search_results, rag_results),
        media_type="text/event-stream",
    )
