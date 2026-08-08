from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_admin
from app.models.app_setting import AppSetting
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.model_config import ModelConfig
from app.models.system_prompt_history import SystemPromptHistory
from app.models.user import User
from app.schemas.auth import AdminCreateUserRequest, AdminUpdateUserRequest
from app.schemas.app_setting import SystemPromptResponse, UpdateSystemPromptRequest
from app.schemas.model import CreateModelRequest, UpdateModelRequest
from app.services.chat_service import (
    DEFAULT_GLOBAL_SYSTEM_PROMPT,
    build_messages_with_search_context,
    prepend_system_prompt,
    trim_messages_to_token_budget,
)
from app.services.auth_service import register_user
from app.core.security import hash_password
from app.config import settings

router = APIRouter(dependencies=[Depends(require_admin)])

SYSTEM_PROMPT_KEY = "global_system_prompt"


async def _get_or_create_system_prompt_setting(db: AsyncSession) -> AppSetting:
    result = await db.execute(select(AppSetting).where(AppSetting.key == SYSTEM_PROMPT_KEY))
    setting = result.scalar_one_or_none()
    if setting is not None:
        if not setting.value.strip():
            setting.value = DEFAULT_GLOBAL_SYSTEM_PROMPT
            await db.flush()
        return setting

    setting = AppSetting(key=SYSTEM_PROMPT_KEY, value=DEFAULT_GLOBAL_SYSTEM_PROMPT)
    db.add(setting)
    await db.flush()
    return setting


def _estimate_token_count(text: str | None) -> int:
    if not text:
        return 0
    return max(1, (len(text) + 3) // 4)


def _validate_model_provider(provider_name: str) -> None:
    if provider_name not in {"azure-openai", "openai"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported provider_name. Use 'azure-openai' or 'openai'.",
        )


def _build_internal_api_key_ref(model_id: UUID) -> str:
    return f"model_{model_id.hex}"


def _upsert_provider_api_key(
    *,
    provider_name: str,
    api_key_ref: str,
    api_key: str | None,
    base_url: str,
    model_id: str,
) -> None:
    normalized_api_key = (api_key or "").strip()
    if not normalized_api_key:
        return

    config = settings.api_keys.copy()
    providers = dict(config.get("llm_providers", {}))
    existing_provider = dict(providers.get(api_key_ref, {}))
    provider_config = {
        **existing_provider,
        "base_url": base_url,
        "api_key": normalized_api_key,
    }

    if provider_name == "azure-openai":
        provider_config["deployment"] = model_id
        provider_config.setdefault("api_version", existing_provider.get("api_version") or "2025-03-01-preview")
    else:
        provider_config.pop("deployment", None)
        provider_config.pop("api_version", None)

    providers[api_key_ref] = provider_config
    config["llm_providers"] = providers
    settings.save_api_keys(config)


def _sync_provider_config(
    *,
    provider_name: str,
    api_key_ref: str,
    api_key: str | None,
    base_url: str,
    model_id: str,
    require_api_key: bool,
) -> None:
    _validate_model_provider(provider_name)

    existing_provider = settings.api_keys.get("llm_providers", {}).get(api_key_ref)
    normalized_api_key = (api_key or "").strip()
    if require_api_key and not normalized_api_key and not existing_provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key is required when creating a model or when no stored key exists yet.",
        )

    _upsert_provider_api_key(
        provider_name=provider_name,
        api_key_ref=api_key_ref,
        api_key=normalized_api_key or existing_provider.get("api_key") if existing_provider else normalized_api_key,
        base_url=base_url,
        model_id=model_id,
    )


def _serialize_admin_model(model: ModelConfig) -> dict[str, str | int | bool]:
    return {
        "id": str(model.id),
        "display_name": model.display_name,
        "model_id": model.model_id,
        "provider_name": model.provider_name,
        "base_url": model.base_url,
        "context_length": model.context_length,
        "is_active": model.is_active,
    }


async def _ensure_unique_model_display_name(
    db: AsyncSession,
    *,
    display_name: str,
    exclude_model_id: UUID | None = None,
) -> None:
    normalized_name = display_name.strip()
    if not normalized_name:
        return

    query = select(ModelConfig).where(func.lower(ModelConfig.display_name) == normalized_name.lower())
    if exclude_model_id is not None:
        query = query.where(ModelConfig.id != exclude_model_id)

    existing = await db.execute(query)
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Model display name already exists")


@router.get("/settings/system-prompt", response_model=SystemPromptResponse)
@router.get("/settings/system-prompt/", response_model=SystemPromptResponse)
async def get_system_prompt(db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create_system_prompt_setting(db)
    await db.commit()
    return {"system_prompt": setting.value}


@router.patch("/settings/system-prompt", response_model=SystemPromptResponse)
@router.patch("/settings/system-prompt/", response_model=SystemPromptResponse)
async def update_system_prompt(payload: UpdateSystemPromptRequest, db: AsyncSession = Depends(get_db)):
    setting = await _get_or_create_system_prompt_setting(db)
    setting.value = payload.system_prompt
    await db.commit()
    await db.refresh(setting)
    return {"system_prompt": setting.value}


@router.get("/usage-logs")
@router.get("/usage-logs/")
async def list_usage_logs(page: int = 1, limit: int = 50, db: AsyncSession = Depends(get_db)):
    safe_limit = min(max(limit, 1), 200)
    safe_page = max(page, 1)
    offset = (safe_page - 1) * safe_limit
    latest_message = aliased(Message)

    total_result = await db.execute(
        select(func.count())
        .select_from(Conversation)
        .join(latest_message, latest_message.conversation_id == Conversation.id)
        .where(
            latest_message.role == "assistant",
            latest_message.tokens_used.is_not(None),
            latest_message.created_at
            == select(func.max(Message.created_at))
            .where(
                Message.conversation_id == Conversation.id,
                Message.role == "assistant",
                Message.tokens_used.is_not(None),
            )
            .correlate(Conversation)
            .scalar_subquery(),
        )
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(latest_message, Conversation, User, ModelConfig)
        .join(Conversation, latest_message.conversation_id == Conversation.id)
        .join(User, Conversation.user_id == User.id)
        .outerjoin(ModelConfig, Conversation.model_id == ModelConfig.id)
        .where(
            latest_message.role == "assistant",
            latest_message.tokens_used.is_not(None),
            latest_message.created_at
            == select(func.max(Message.created_at))
            .where(
                Message.conversation_id == Conversation.id,
                Message.role == "assistant",
                Message.tokens_used.is_not(None),
            )
            .correlate(Conversation)
            .scalar_subquery(),
        )
        .order_by(latest_message.created_at.desc())
        .offset(offset)
        .limit(safe_limit)
    )
    usage_rows = result.all()

    conversation_ids = [conversation.id for _, conversation, _, _ in usage_rows]
    message_rows = []
    prompt_history_rows = []
    if conversation_ids:
        message_result = await db.execute(
            select(Message)
            .where(Message.conversation_id.in_(conversation_ids))
            .order_by(Message.conversation_id.asc(), Message.created_at.asc())
        )
        message_rows = message_result.scalars().all()

        prompt_history_result = await db.execute(
            select(SystemPromptHistory)
            .where(SystemPromptHistory.conversation_id.in_(conversation_ids))
            .order_by(SystemPromptHistory.conversation_id.asc(), SystemPromptHistory.created_at.asc())
        )
        prompt_history_rows = prompt_history_result.scalars().all()

    messages_by_conversation: dict[UUID, list[Message]] = {}
    for conversation_message in message_rows:
        messages_by_conversation.setdefault(conversation_message.conversation_id, []).append(conversation_message)

    prompt_history_by_conversation: dict[UUID, list[SystemPromptHistory]] = {}
    for prompt_history in prompt_history_rows:
        prompt_history_by_conversation.setdefault(prompt_history.conversation_id, []).append(prompt_history)

    system_prompt_setting = await _get_or_create_system_prompt_setting(db)
    current_system_prompt = system_prompt_setting.value.strip() or DEFAULT_GLOBAL_SYSTEM_PROMPT

    items = []
    for message, conversation, user, model in usage_rows:
        conversation_messages = messages_by_conversation.get(conversation.id, [])
        conversation_prompt_history = prompt_history_by_conversation.get(conversation.id, [])
        context_window = model.context_length if model else None
        max_input_tokens = min(6000, context_window) if context_window else 6000

        raw_history_messages = []
        for item in conversation_messages:
            if item.created_at > message.created_at:
                continue
            if item.role not in {"user", "assistant", "system"} or not item.content:
                continue

            raw_history_messages.append(
                {
                    "role": item.role,
                    "content": item.content,
                    "search_results": item.search_results,
                    "created_at": item.created_at,
                }
            )

        prompt_history_index = 0
        enriched_history_messages: list[dict[str, str]] = []

        for history_message in raw_history_messages:
            while prompt_history_index < len(conversation_prompt_history):
                prompt_history = conversation_prompt_history[prompt_history_index]
                if prompt_history.created_at > message.created_at:
                    break
                if prompt_history.created_at > history_message.get("created_at", message.created_at):
                    break

                prompt_text = prompt_history.prompt_text.strip()
                if prompt_text:
                    enriched_history_messages.append(
                        {
                            "role": "system",
                            "content": prompt_text,
                        }
                    )
                prompt_history_index += 1

            enriched_history_messages.extend(
                build_messages_with_search_context(
                    [
                        {
                            "role": history_message["role"],
                            "content": history_message["content"],
                            "search_results": history_message.get("search_results"),
                        }
                    ]
                )
            )

        while prompt_history_index < len(conversation_prompt_history):
            prompt_history = conversation_prompt_history[prompt_history_index]
            if prompt_history.created_at > message.created_at:
                break

            prompt_text = prompt_history.prompt_text.strip()
            if prompt_text:
                enriched_history_messages.append(
                    {
                        "role": "system",
                        "content": prompt_text,
                    }
                )
            prompt_history_index += 1

        if not enriched_history_messages and current_system_prompt:
            enriched_history_messages = prepend_system_prompt([], current_system_prompt)

        trimmed_input_messages = trim_messages_to_token_budget(enriched_history_messages, max_input_tokens)

        input_chars = sum(len(item.get("content") or "") for item in trimmed_input_messages)
        estimated_input_tokens = sum(_estimate_token_count(item.get("content")) for item in trimmed_input_messages)
        user_message_count = sum(1 for item in trimmed_input_messages if item.get("role") == "user")
        assistant_message_count = sum(1 for item in trimmed_input_messages if item.get("role") == "assistant")
        system_message_count = sum(1 for item in trimmed_input_messages if item.get("role") == "system")
        search_message_count = sum(1 for item in raw_history_messages if item.get("search_results"))
        turn_count = min(user_message_count, assistant_message_count)
        context_utilization = round((estimated_input_tokens / max_input_tokens) * 100, 1) if max_input_tokens else None
        current_user_message = next(
            (
                item.get("content")
                for item in reversed(raw_history_messages)
                if item.get("role") == "user"
            ),
            None,
        )

        items.append(
            {
                "id": str(message.id),
                "conversation_id": str(conversation.id),
                "user_id": str(user.id),
                "user_email": user.email,
                "conversation_title": conversation.title,
                "model_id": str(model.id) if model else str(conversation.model_id) if conversation.model_id else None,
                "model_name": model.display_name if model else None,
                "provider_name": model.provider_name if model else None,
                "tokens_used": message.tokens_used,
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "preview": message.content[:160],
                "current_user_ask": current_user_message,
                "context_analysis": {
                    "message_count": len(trimmed_input_messages),
                    "turn_count": turn_count,
                    "user_message_count": user_message_count,
                    "assistant_message_count": assistant_message_count,
                    "system_message_count": system_message_count,
                    "search_message_count": search_message_count,
                    "input_characters": input_chars,
                    "estimated_input_tokens": estimated_input_tokens,
                    "context_window": context_window,
                    "effective_context_limit": max_input_tokens,
                    "context_utilization_percent": context_utilization,
                    "trimmed_messages": [
                        {
                            "role": item.get("role"),
                            "content": item.get("content") or "",
                            "estimated_tokens": _estimate_token_count(item.get("content")),
                        }
                        for item in trimmed_input_messages
                    ],
                },
            }
        )

    return {
        "items": items,
        "page": safe_page,
        "limit": safe_limit,
        "total": total,
    }


@router.get("/users")
@router.get("/users/")
async def list_users(page: int = 1, limit: int = 50, db: AsyncSession = Depends(get_db)):
    offset = max(page - 1, 0) * limit
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(limit))
    users = result.scalars().all()
    return {
        "items": [
            {"id": str(user.id), "email": user.email, "role": user.role, "is_active": user.is_active}
            for user in users
        ],
        "page": page,
        "limit": limit,
    }


@router.post("/users")
@router.post("/users/")
async def create_user(payload: AdminCreateUserRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = await register_user(db, payload.email, payload.password, role=payload.role)
    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "email": user.email, "role": user.role, "is_active": user.is_active}


@router.get("/users/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"id": str(user.id), "email": user.email, "role": user.role, "is_active": user.is_active}


@router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: AdminUpdateUserRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None and payload.email != user.email:
        existing = await db.execute(select(User).where(User.email == payload.email, User.id != user.id))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = payload.email
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "email": user.email, "role": user.role, "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/models")
@router.get("/models/")
async def list_admin_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).order_by(ModelConfig.created_at.desc()))
    models = result.scalars().all()
    return {
        "items": [_serialize_admin_model(model) for model in models]
    }


@router.post("/models")
@router.post("/models/")
async def create_model(payload: CreateModelRequest, db: AsyncSession = Depends(get_db)):
    await _ensure_unique_model_display_name(db, display_name=payload.display_name)
    model_uuid = uuid4()
    api_key_ref = _build_internal_api_key_ref(model_uuid)
    _sync_provider_config(
        provider_name=payload.provider_name,
        api_key_ref=api_key_ref,
        api_key=payload.api_key,
        base_url=payload.base_url,
        model_id=payload.model_id,
        require_api_key=True,
    )
    model_payload = payload.model_dump(exclude={"api_key", "api_key_ref"})
    model = ModelConfig(id=model_uuid, api_key_ref=api_key_ref, **model_payload)
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return _serialize_admin_model(model)


@router.get("/models/{model_id}")
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == UUID(model_id)))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return _serialize_admin_model(model)


@router.patch("/models/{model_id}")
async def update_model(model_id: str, payload: UpdateModelRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == UUID(model_id)))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    if payload.display_name is not None and payload.display_name.strip() != model.display_name:
        await _ensure_unique_model_display_name(db, display_name=payload.display_name, exclude_model_id=model.id)

    next_provider_name = payload.provider_name if payload.provider_name is not None else model.provider_name
    next_api_key_ref = model.api_key_ref or _build_internal_api_key_ref(model.id)
    next_base_url = payload.base_url if payload.base_url is not None else model.base_url
    next_model_id = payload.model_id if payload.model_id is not None else model.model_id
    _sync_provider_config(
        provider_name=next_provider_name,
        api_key_ref=next_api_key_ref,
        api_key=payload.api_key,
        base_url=next_base_url,
        model_id=next_model_id,
        require_api_key=False,
    )
    model.api_key_ref = next_api_key_ref

    for field, value in payload.model_dump(exclude_unset=True, exclude={"api_key"}).items():
        setattr(model, field, value)

    await db.commit()
    await db.refresh(model)
    return _serialize_admin_model(model)


@router.delete("/models/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.id == UUID(model_id)))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    await db.delete(model)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
