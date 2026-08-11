from __future__ import annotations

from openai import AsyncAzureOpenAI, AsyncOpenAI

from app.config import settings
from app.core.exceptions import UserSafeError

DEFAULT_EMBEDDING_DIMENSIONS = 1536


def _get_embedding_config() -> dict:
    embeddings = settings.api_keys.get("embeddings", {})
    default_config = embeddings.get("default")
    if not default_config:
        raise UserSafeError(
            "Knowledge base retrieval is unavailable because embeddings are not configured.",
            code="rag_config_missing",
            source="rag",
            retryable=False,
            status_code=502,
        )
    return default_config


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    config = _get_embedding_config()
    provider = config.get("provider", "azure-openai")
    model_name = config.get("deployment") or config.get("model")
    if not model_name:
        raise UserSafeError(
            "Knowledge base retrieval is unavailable because the embedding model is not configured.",
            code="rag_model_missing",
            source="rag",
            retryable=False,
            status_code=502,
        )

    if provider == "azure-openai":
        client = AsyncAzureOpenAI(
            api_key=config["api_key"],
            api_version=config["api_version"],
            azure_endpoint=config["base_url"],
        )
        response = await client.embeddings.create(model=model_name, input=texts)
    else:
        client = AsyncOpenAI(api_key=config["api_key"], base_url=config.get("base_url"))
        response = await client.embeddings.create(model=model_name, input=texts)

    return [list(item.embedding) for item in response.data]


async def embed_query(text: str) -> list[float]:
    embeddings = await embed_texts([text])
    return embeddings[0] if embeddings else [0.0] * DEFAULT_EMBEDDING_DIMENSIONS