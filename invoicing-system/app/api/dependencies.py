"""API dependencies for authentication and authorization."""

from datetime import datetime
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole


security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Get the current authenticated user from JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Get user from database
    stmt = (
        select(User)
        .options(selectinload(User.company))
        .where(
            User.id == user_id,
            User.is_active == True,
            User.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the current user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def require_permission(permission: str):
    """
    Dependency factory for requiring specific permissions.
    
    Usage:
        @router.post("/", dependencies=[Depends(require_permission("invoices.create"))])
    """
    async def permission_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ):
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )
        return current_user

    return permission_checker


def require_role(*roles: UserRole):
    """
    Dependency factory for requiring specific roles.
    
    Usage:
        @router.post("/", dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.OWNER))])
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role privileges",
            )
        return current_user

    return role_checker


class RequestContext:
    """Context for the current request including user and company info."""

    def __init__(
        self,
        user: User,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        self.user = user
        self.db = db
        self.company_id = user.company_id
        self.user_id = user.id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.request_id = request_id


async def get_request_context(
    request: Request,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_request_id: Annotated[Optional[str], Header()] = None,
) -> RequestContext:
    """Get request context with user, company, and request info."""
    # Get client IP (handle proxy headers)
    ip_address = request.client.host if request.client else None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()

    user_agent = request.headers.get("user-agent")

    return RequestContext(
        user=current_user,
        db=db,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=x_request_id,
    )


# Type aliases for cleaner dependency injection
CurrentUser = Annotated[User, Depends(get_current_active_user)]
Context = Annotated[RequestContext, Depends(get_request_context)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


# Role-specific dependencies
OwnerUser = Annotated[User, Depends(require_role(UserRole.OWNER))]
AdminUser = Annotated[User, Depends(require_role(UserRole.OWNER, UserRole.ADMIN))]
AccountantUser = Annotated[
    User, Depends(require_role(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT))
]


# Permission-specific dependencies
def can_create_invoices():
    return require_permission("invoices.create")


def can_edit_invoices():
    return require_permission("invoices.edit")


def can_send_invoices():
    return require_permission("invoices.send")


def can_view_invoices():
    return require_permission("invoices.view")


def can_manage_customers():
    return require_permission("customers.manage")


def can_view_audit():
    return require_permission("audit.view")
