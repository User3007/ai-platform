from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
import sys

from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database import AsyncSessionLocal
from app.models.model_config import ModelConfig

DEFAULT_MODELS = [
    {
        "display_name": "Azure OpenAI GPT-5.4 Mini",
        "model_id": "gpt-5.4-mini",
        "provider_name": "azure-openai",
        "base_url": "https://thien-mmxiqjae-eastus2.cognitiveservices.azure.com/",
        "api_key_ref": "azure_openai_gpt_5_4_mini",
        "context_length": 16384,
        "is_active": True,
    }
]


async def seed_models() -> None:
    async with AsyncSessionLocal() as session:
        for payload in DEFAULT_MODELS:
            result = await session.execute(
                select(ModelConfig).where(
                    ModelConfig.provider_name == payload["provider_name"],
                    ModelConfig.model_id == payload["model_id"],
                )
            )
            model = result.scalar_one_or_none()
            if model is None:
                session.add(ModelConfig(**payload))
                continue

            model.display_name = payload["display_name"]
            model.base_url = payload["base_url"]
            model.api_key_ref = payload["api_key_ref"]
            model.context_length = payload["context_length"]
            model.is_active = payload["is_active"]
            model.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_models())
