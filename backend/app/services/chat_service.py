from __future__ import annotations

from openai import AsyncAzureOpenAI, AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.app_setting import AppSetting
from app.models.model_config import ModelConfig

DEFAULT_CHARS_PER_TOKEN = 4
TITLE_SUMMARY_MESSAGE_LIMIT = 6
TITLE_SUMMARY_CHAR_LIMIT = 1200
SEARCH_RESULT_LIMIT = 5
SEARCH_SNIPPET_CHAR_LIMIT = 400
SYSTEM_PROMPT_KEY = "global_system_prompt"
DEFAULT_GLOBAL_SYSTEM_PROMPT = (
    "You are AI Platform Assistant, a helpful, accurate, and concise assistant for internal users. "
    "Give direct answers first, then add brief supporting detail when useful. "
    "If web search context is provided, use it carefully and cite concrete details from it when relevant. "
    "If information is uncertain or missing, say so clearly instead of guessing."
)


def _get_provider_config(api_key_ref: str) -> dict:
    providers = settings.api_keys.get("llm_providers", {})
    provider_config = providers.get(api_key_ref)
    if not provider_config:
        raise ValueError(f"Missing provider config for api_key_ref '{api_key_ref}'")
    return provider_config


def _build_input_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {
            "role": message["role"],
            "content": message["content"],
        }
        for message in messages
        if message.get("content")
    ]


def _format_search_context(search_results: list[dict[str, str]]) -> str:
    lines = [
        "Use the following web search results as supporting context when they are relevant.",
        "Cite concrete details from the results in the answer when helpful.",
    ]

    for index, result in enumerate(search_results[:SEARCH_RESULT_LIMIT], start=1):
        title = (result.get("title") or "Untitled result").strip()
        url = (result.get("url") or "").strip()
        snippet = (result.get("snippet") or "").strip()[:SEARCH_SNIPPET_CHAR_LIMIT]
        lines.append(f"{index}. {title}")
        if url:
            lines.append(f"   URL: {url}")
        if snippet:
            lines.append(f"   Snippet: {snippet}")

    return "\n".join(lines)


def prepend_context_message(messages: list[dict[str, str]], context: str | None) -> list[dict[str, str]]:
    normalized_context = (context or "").strip()
    if not normalized_context:
        return messages

    return [
        {
            "role": "system",
            "content": normalized_context,
        },
        *messages,
    ]


def build_messages_with_search_context(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    enriched_messages: list[dict[str, str]] = []

    for message in messages:
        content = message.get("content")
        if not content:
            continue

        search_results = message.get("search_results")
        if search_results:
            enriched_messages.append(
                {
                    "role": "system",
                    "content": _format_search_context(search_results),
                }
            )

        enriched_messages.append(
            {
                "role": message["role"],
                "content": content,
            }
        )

    return enriched_messages


def prepend_system_prompt(messages: list[dict[str, str]], system_prompt: str | None) -> list[dict[str, str]]:
    normalized_prompt = (system_prompt or "").strip()
    if not normalized_prompt:
        return messages

    return [
        {
            "role": "system",
            "content": normalized_prompt,
        },
        *messages,
    ]


async def get_global_system_prompt(db: AsyncSession) -> str:
    result = await db.execute(select(AppSetting.value).where(AppSetting.key == SYSTEM_PROMPT_KEY))
    value = result.scalar_one_or_none()
    return (value or DEFAULT_GLOBAL_SYSTEM_PROMPT).strip()


def _estimate_token_count(text: str) -> int:
    return max(1, (len(text) + DEFAULT_CHARS_PER_TOKEN - 1) // DEFAULT_CHARS_PER_TOKEN)


def trim_messages_to_token_budget(messages: list[dict[str, str]], max_tokens: int) -> list[dict[str, str]]:
    if max_tokens <= 0:
        return _build_input_messages(messages)

    normalized_messages = _build_input_messages(messages)
    if not normalized_messages:
        return []

    trimmed_messages: list[dict[str, str]] = []
    running_tokens = 0

    for message in reversed(normalized_messages):
        estimated_tokens = _estimate_token_count(message["content"])
        if trimmed_messages and running_tokens + estimated_tokens > max_tokens:
            break
        trimmed_messages.append(message)
        running_tokens += estimated_tokens

    return list(reversed(trimmed_messages))


def build_title_summary_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    recent_messages = _build_input_messages(messages)[-TITLE_SUMMARY_MESSAGE_LIMIT:]
    summary_messages: list[dict[str, str]] = []

    for message in recent_messages:
        content = message["content"].strip()
        if not content:
            continue
        summary_messages.append(
            {
                "role": message["role"],
                "content": content[:TITLE_SUMMARY_CHAR_LIMIT],
            }
        )

    return summary_messages


async def build_chat_response(messages: list[dict[str, str]], model: ModelConfig) -> dict:
    provider_config = _get_provider_config(model.api_key_ref)
    max_input_tokens = min(settings.max_history_tokens, model.context_length)
    input_messages = trim_messages_to_token_budget(build_messages_with_search_context(messages), max_input_tokens)

    if model.provider_name == "azure-openai":
        client = AsyncAzureOpenAI(
            api_key=provider_config["api_key"],
            api_version=provider_config["api_version"],
            azure_endpoint=provider_config["base_url"],
        )
        response = await client.responses.create(
            model=provider_config.get("deployment", model.model_id),
            input=input_messages,
        )
    else:
        client = AsyncOpenAI(api_key=provider_config["api_key"], base_url=provider_config.get("base_url"))
        response = await client.responses.create(model=model.model_id, input=input_messages)

    output_text = getattr(response, "output_text", "") or ""
    usage = getattr(response, "usage", None)
    total_tokens = getattr(usage, "total_tokens", None) if usage else None

    return {
        "content": output_text.strip() or "No response received.",
        "tokens_used": total_tokens,
    }


async def summarize_conversation_title(messages: list[dict[str, str]], model: ModelConfig) -> str:
    summary_messages = [
        {
            "role": "system",
            "content": (
                "Generate a short conversation title of 3 to 8 words. "
                "Return only the title text with no quotes, punctuation suffix, or explanation."
            ),
        },
        *build_title_summary_messages(messages),
    ]
    response = await build_chat_response(summary_messages, model)
    return response["content"].strip()[:255] or "New conversation"
