"""Authentication API routes."""

from datetime import datetime, timedelta
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentUser, DbSession
from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserPasswordChange,
    UserResponse,
)


router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Find user by email
    stmt = (
        select(User)
        .options(selectinload(User.company))
        .where(
            User.email == form_data.username,
            User.is_active == True,
            User.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action=AuditAction.USER_LOGIN,
        entity_type="user",
        entity_id=user.id,
    )
    db.add(audit_log)

    await db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "company_id": user.company_id}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/token", response_model=TokenResponse)
async def login_for_token(
    data: LoginRequest,
    db: DbSession,
):
    """
    JSON login endpoint (alternative to OAuth2 form).
    """
    stmt = (
        select(User)
        .options(selectinload(User.company))
        .where(
            User.email == data.email,
            User.is_active == True,
            User.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user.last_login_at = datetime.utcnow()

    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action=AuditAction.USER_LOGIN,
        entity_type="user",
        entity_id=user.id,
    )
    db.add(audit_log)

    await db.commit()

    access_token = create_access_token(
        data={"sub": user.id, "company_id": user.company_id}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """
    Get information about the currently authenticated user.
    """
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    data: UserPasswordChange,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Change the current user's password.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(data.new_password)

    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=current_user.company_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action=AuditAction.USER_PASSWORD_CHANGED,
        entity_type="user",
        entity_id=current_user.id,
    )
    db.add(audit_log)

    await db.commit()

    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Logout the current user (for audit purposes).
    
    Note: JWT tokens are stateless, so this mainly creates an audit log.
    For full token invalidation, implement a token blacklist.
    """
    audit_log = AuditLog(
        id=str(uuid4()),
        company_id=current_user.company_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action=AuditAction.USER_LOGOUT,
        entity_type="user",
        entity_id=current_user.id,
    )
    db.add(audit_log)

    await db.commit()

    return {"message": "Logged out successfully"}
