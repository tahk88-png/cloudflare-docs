"""User schemas for API validation."""

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from app.models.user import UserRole
from app.schemas.base import BaseSchema, PaginatedResponse, TimestampSchema


class UserCreate(BaseSchema):
    """Schema for creating a user."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    role: UserRole = UserRole.VIEWER


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserPasswordChange(BaseSchema):
    """Schema for changing password."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(TimestampSchema):
    """Schema for user response."""

    id: str
    company_id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    is_email_verified: bool
    last_login_at: Optional[datetime]
    full_name: str
    permissions: set[str]


class UserListResponse(PaginatedResponse):
    """Paginated list of users."""

    items: list[UserResponse]


class LoginRequest(BaseSchema):
    """Schema for login request."""

    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    """Schema for authentication token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseSchema):
    """Schema for token refresh."""

    refresh_token: str
