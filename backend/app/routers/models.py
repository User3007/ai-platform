from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.model_config import ModelConfig

router = APIRouter()


@router.get("")
@router.get("/")
async def list_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelConfig).where(ModelConfig.is_active.is_(True)).order_by(ModelConfig.display_name.asc()))
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": str(item.id),
                "display_name": item.display_name,
                "model_id": item.model_id,
                "provider_name": item.provider_name,
                "base_url": item.base_url,
                "context_length": item.context_length,
                "is_active": item.is_active,
            }
            for item in items
        ]
    }
