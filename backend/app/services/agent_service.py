async def should_use_search(content: str, requested: bool):
    return requested or "search" in content.lower()
