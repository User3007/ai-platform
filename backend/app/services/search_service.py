from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.config import settings

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
DEFAULT_SEARCH_COUNT = 5


def _get_brave_api_key() -> str:
    brave_config = settings.api_keys.get("brave_search", {})
    api_key = brave_config.get("api_key")
    if not api_key:
        raise ValueError("Missing Brave Search API key in backend/config/api_keys.yaml")
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

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{BRAVE_SEARCH_URL}?{params}",
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": api_key,
            },
        )
        response.raise_for_status()

    payload = response.json()
    results = payload.get("web", {}).get("results", [])
    return [_normalize_result(result) for result in results]
