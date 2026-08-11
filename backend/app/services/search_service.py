from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.config import settings
from app.core.exceptions import UserSafeError

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
DEFAULT_SEARCH_COUNT = 5


def _get_brave_api_key() -> str:
    brave_config = settings.api_keys.get("brave_search", {})
    api_key = brave_config.get("api_key")
    if not api_key:
        raise UserSafeError(
            "Web search is unavailable because the search provider is not configured.",
            code="search_config_missing",
            source="search",
            retryable=False,
            status_code=502,
        )
    return api_key


def _normalize_result(result: dict) -> dict:
    return {
        "title": result.get("title") or result.get("url") or "Untitled result",
        "snippet": result.get("description") or "",
        "url": result.get("url") or "",
    }


async def search_web(query: str, count: int = DEFAULT_SEARCH_COUNT) -> list[dict[str, str]]:
    normalized_query = query.strip()
    if not normalized_query:
        return []

    api_key = _get_brave_api_key()
    params = urlencode({"q": normalized_query, "count": max(1, min(count, 10))})

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{BRAVE_SEARCH_URL}?{params}",
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": api_key,
                },
            )
            response.raise_for_status()
    except UserSafeError:
        raise
    except httpx.TimeoutException as exc:
        raise UserSafeError(
            "Web search timed out. The assistant can continue without web results.",
            code="search_timeout",
            source="search",
            retryable=True,
            status_code=502,
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise UserSafeError(
            "Web search is temporarily unavailable. The assistant can continue without web results.",
            code="search_upstream_error",
            source="search",
            retryable=True,
            status_code=502,
        ) from exc
    except httpx.HTTPError as exc:
        raise UserSafeError(
            "Web search could not be reached. The assistant can continue without web results.",
            code="search_network_error",
            source="search",
            retryable=True,
            status_code=502,
        ) from exc

    payload = response.json()
    results = payload.get("web", {}).get("results", [])
    return [_normalize_result(result) for result in results]
