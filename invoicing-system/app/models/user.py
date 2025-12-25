"""User model with RBAC roles."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company


class UserRole(str, enum.Enum):
    """User roles for RBAC."""

    OWNER = "owner"  # Full access, can delete company
    ADMIN = "admin"  # Full access except company deletion
    ACCOUNTANT = "accountant"  # Can create/edit/send invoices
    VIEWER = "viewer"  # Read-only access


# Permission definitions per role
ROLE_PERMISSIONS = {
    UserRole.OWNER: {
        "company.manage",
        "company.delete",
        "users.manage",
        "invoices.create",
        "invoices.edit",
        "invoices.delete",
        "invoices.send",
        "invoices.view",
        "customers.manage",
        "templates.manage",
        "settings.manage",
        "audit.view",
        "payments.manage",
    },
    UserRole.ADMIN: {
        "company.manage",
        "users.manage",
        "invoices.create",
        "invoices.edit",
        "invoices.delete",
        "invoices.send",
        "invoices.view",
        "customers.manage",
        "templates.manage",
        "settings.manage",
        "audit.view",
        "payments.manage",
    },
    UserRole.ACCOUNTANT: {
        "invoices.create",
        "invoices.edit",
        "invoices.send",
        "invoices.view",
        "customers.manage",
        "templates.manage",
        "audit.view",
    },
    UserRole.VIEWER: {
        "invoices.view",
        "audit.view",
    },
}


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """User model with multi-tenant support."""

    __tablename__ = "users"

    # Company relationship (multi-tenant)
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Authentication
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Role & Permissions
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.VIEWER,
        nullable=False,
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    company: Mapped["Company"] = relationship("Company", back_populates="users")

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def permissions(self) -> set[str]:
        """Get user's permissions based on role."""
        return ROLE_PERMISSIONS.get(self.role, set())

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        return permission in self.permissions
