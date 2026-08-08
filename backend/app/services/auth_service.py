from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services.token_service import create_access_token, issue_refresh_token


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash) or not user.is_active:
        return None
    return user


async def register_user(session: AsyncSession, email: str, password: str, role: str = "user") -> User:
    user = User(email=email, password_hash=hash_password(password), role=role)
    session.add(user)
    await session.flush()
    return user


async def build_auth_payload(session: AsyncSession, user: User) -> tuple[str, str]:
    access_token = create_access_token(user)
    refresh_token = await issue_refresh_token(session, user.id)
    return access_token, refresh_token
