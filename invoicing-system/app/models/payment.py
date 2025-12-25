"""Payment model for tracking invoice payments."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.invoice import Invoice


class PaymentProvider(str, enum.Enum):
    """Supported payment providers."""

    MANUAL = "manual"  # Manual payment (bank transfer, cash, etc.)
    STRIPE = "stripe"
    MONTONIO = "montonio"
    PAYPAL = "paypal"  # Future support
    OTHER = "other"


class PaymentStatus(str, enum.Enum):
    """Payment status."""

    PENDING = "pending"  # Payment initiated
    PROCESSING = "processing"  # Being processed
    COMPLETED = "completed"  # Successfully completed
    FAILED = "failed"  # Payment failed
    CANCELLED = "cancelled"  # Cancelled by user
    REFUNDED = "refunded"  # Full refund
    PARTIALLY_REFUNDED = "partially_refunded"  # Partial refund
    DISPUTED = "disputed"  # Chargeback/dispute


class PaymentMethod(str, enum.Enum):
    """Payment methods."""

    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_LINK = "bank_link"  # Baltic bank links
    CASH = "cash"
    CHECK = "check"
    OTHER = "other"


class Payment(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """Payment record for invoices."""

    __tablename__ = "payments"

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

    # Payment Details
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, name="payment_provider"),
        default=PaymentProvider.MANUAL,
        nullable=False,
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    method: Mapped[Optional[PaymentMethod]] = mapped_column(
        Enum(PaymentMethod, name="payment_method"),
        nullable=True,
    )

    # Amount (in cents)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)
    fee: Mapped[int] = mapped_column(Integer, default=0)  # Payment provider fee

    # Refund tracking
    refunded_amount: Mapped[int] = mapped_column(Integer, default=0)

    # Provider References
    external_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, index=True
    )  # Provider's payment ID
    external_reference: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Additional reference
    checkout_session_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # For Stripe/Montonio sessions

    # Payment Link
    payment_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    payment_url_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Error Tracking
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Provider-specific data
    provider_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Webhook tracking
    last_webhook_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    webhook_events: Mapped[Optional[list]] = mapped_column(
        JSONB, nullable=True
    )  # List of webhook event types received

    # Relationship
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")

    @property
    def is_successful(self) -> bool:
        """Check if payment was successful."""
        return self.status == PaymentStatus.COMPLETED

    @property
    def net_amount(self) -> int:
        """Get net amount after fees and refunds."""
        return self.amount - self.fee - self.refunded_amount

    @property
    def is_refundable(self) -> bool:
        """Check if payment can be refunded."""
        return (
            self.status == PaymentStatus.COMPLETED
            and self.refunded_amount < self.amount
        )
