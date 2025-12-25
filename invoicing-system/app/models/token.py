"""Invoice view token model for secure access."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.invoice import Invoice


class InvoiceViewToken(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """Time-limited token for secure invoice viewing."""

    __tablename__ = "invoice_view_tokens"

    # Tenant
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        nullable=False,
        index=True,
    )

    # Invoice Reference
    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Token
    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )

    # Expiration
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Usage Tracking
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    max_views: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # None = unlimited

    # First and last access
    first_viewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_viewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="view_tokens")
    view_logs: Mapped[list["TokenViewLog"]] = relationship(
        "TokenViewLog", back_populates="token", cascade="all, delete-orphan"
    )

    @property
    def is_expired(self) -> bool:
        """Check if token is expired."""
        return datetime.utcnow() > self.expires_at.replace(tzinfo=None)

    @property
    def is_valid(self) -> bool:
        """Check if token is valid for use."""
        if not self.is_active or self.is_expired:
            return False
        if self.max_views is not None and self.view_count >= self.max_views:
            return False
        return True


class TokenViewLog(Base, UUIDMixin):
    """Log entry for each invoice view via token."""

    __tablename__ = "token_view_logs"

    # Token Reference
    token_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoice_view_tokens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Access Info
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Geolocation (optional, from IP)
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Device Info (parsed from user agent)
    device_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # desktop, mobile, tablet
    browser: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Actions taken during view
    downloaded_pdf: Mapped[bool] = mapped_column(Boolean, default=False)
    clicked_payment_link: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationship
    token: Mapped["InvoiceViewToken"] = relationship(
        "InvoiceViewToken", back_populates="view_logs"
    )
