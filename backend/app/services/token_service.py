from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User

ALGORITHM = "HS256"


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_refresh_token(session: AsyncSession, user_id: UUID) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=expires_at.replace(tzinfo=None),
    )
    session.add(refresh_token)
    await session.flush()
    return raw_token


async def revoke_refresh_token(session: AsyncSession, raw_token: str) -> None:
    token_hash = hash_refresh_token(raw_token)
    result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    token = result.scalar_one_or_none()
    if token is not None:
        token.revoked = True
        await session.flush()


async def rotate_refresh_token(session: AsyncSession, raw_token: str) -> tuple[User, str, str]:
    token_hash = hash_refresh_token(raw_token)
    result = await session.execute(
        select(RefreshToken, User)
        .join(User, User.id == RefreshToken.user_id)
        .where(RefreshToken.token_hash == token_hash)
    )
    row = result.first()
    if row is None:
        raise ValueError("Refresh token not found")

    refresh_token, user = row
    now = datetime.now(timezone.utc)
    expires_at = refresh_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if refresh_token.revoked or expires_at <= now:
        raise ValueError("Refresh token expired or revoked")

    refresh_token.revoked = True
    new_refresh_token = await issue_refresh_token(session, user.id)
    access_token = create_access_token(user)
    await session.flush()
    return user, access_token, new_refresh_token
