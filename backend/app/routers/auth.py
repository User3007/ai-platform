from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, build_auth_payload, register_user
from app.services.token_service import revoke_refresh_token, rotate_refresh_token

router = APIRouter()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
        max_age=int(timedelta(days=settings.jwt_refresh_expire_days).total_seconds()),
        expires=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days),
        path="/",
    )


def _set_user_role_cookie(response: Response, role: str) -> None:
    response.set_cookie(
        "user_role",
        role,
        httponly=False,
        samesite="lax",
        secure=settings.app_env == "production",
        path="/",
    )


def _serialize_user(user: User) -> UserResponse:
    return UserResponse(id=str(user.id), email=user.email, role=user.role, is_active=user.is_active)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token, refresh_token = await build_auth_payload(db, user)
    await db.commit()
    _set_refresh_cookie(response, refresh_token)
    _set_user_role_cookie(response, user.role)
    return TokenResponse(access_token=access_token, user=_serialize_user(user))


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    if not settings.allowed_registration:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration is disabled")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = await register_user(db, payload.email, payload.password)
    access_token, refresh_token = await build_auth_payload(db, user)
    await db.commit()
    _set_refresh_cookie(response, refresh_token)
    _set_user_role_cookie(response, user.role)
    return TokenResponse(access_token=access_token, user=_serialize_user(user))


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await revoke_refresh_token(db, refresh_token)
        await db.commit()
    response.delete_cookie("refresh_token")
    response.delete_cookie("user_role")
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return _serialize_user(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        user, access_token, new_refresh_token = await rotate_refresh_token(db, refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    await db.commit()
    _set_refresh_cookie(response, new_refresh_token)
    _set_user_role_cookie(response, user.role)
    return TokenResponse(access_token=access_token, user=_serialize_user(user))
