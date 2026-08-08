from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.model_config import ModelConfig
from app.models.user import User
from app.schemas.conversation import CreateConversation
from app.services.chat_service import summarize_conversation_title

router = APIRouter()


@router.get("")
@router.get("/")
async def list_conversations(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = max(page - 1, 0) * limit
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": str(item.id),
                "title": item.title,
                "model_id": str(item.model_id) if item.model_id else None,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in items
        ],
        "page": page,
        "limit": limit,
    }


@router.post("")
@router.post("/")
async def create_conversation(
    payload: CreateConversation,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversation = Conversation(
        user_id=user.id,
        title=payload.title or "New conversation",
        model_id=UUID(payload.model_id) if payload.model_id else None,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return {"id": str(conversation.id), "title": conversation.title, "model_id": str(conversation.model_id) if conversation.model_id else None}


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == UUID(conversation_id), Conversation.user_id == user.id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()
    return {
        "id": str(conversation.id),
        "title": conversation.title,
        "model_id": str(conversation.model_id) if conversation.model_id else None,
        "messages": [
            {
                "id": str(message.id),
                "role": message.role,
                "content": message.content,
                "search_results": message.search_results,
                "tokens_used": message.tokens_used,
                "is_error": message.is_error,
                "created_at": message.created_at.isoformat(),
            }
            for message in messages
        ],
    }


@router.patch("/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    payload: CreateConversation,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == UUID(conversation_id), Conversation.user_id == user.id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if payload.title is not None:
        conversation.title = payload.title
    if payload.model_id is not None:
        conversation.model_id = UUID(payload.model_id)
    await db.commit()
    await db.refresh(conversation)
    return {"id": str(conversation.id), "title": conversation.title, "model_id": str(conversation.model_id) if conversation.model_id else None}


@router.post("/{conversation_id}/summarize-title")
async def summarize_title(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == UUID(conversation_id), Conversation.user_id == user.id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()
    chat_messages = [
        {"role": message.role, "content": message.content}
        for message in messages
        if message.role in {"user", "assistant", "system"} and message.content
    ]

    if not chat_messages:
        return {"id": str(conversation.id), "title": conversation.title, "model_id": str(conversation.model_id) if conversation.model_id else None}

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

    conversation.title = await summarize_conversation_title(chat_messages, model)
    await db.commit()
    await db.refresh(conversation)
    return {"id": str(conversation.id), "title": conversation.title, "model_id": str(conversation.model_id) if conversation.model_id else None}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == UUID(conversation_id), Conversation.user_id == user.id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    await db.delete(conversation)
    await db.commit()
    return {"id": conversation_id, "deleted": True}
