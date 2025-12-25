"""Email log model for tracking email delivery."""

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


class EmailStatus(str, enum.Enum):
    """Email delivery status."""

    QUEUED = "queued"  # In queue, waiting to send
    SENDING = "sending"  # Currently being sent
    SENT = "sent"  # Successfully sent
    DELIVERED = "delivered"  # Confirmed delivery (if webhook available)
    OPENED = "opened"  # Email opened (if tracking enabled)
    BOUNCED = "bounced"  # Bounced (hard or soft)
    FAILED = "failed"  # Failed after all retries
    CANCELLED = "cancelled"  # Cancelled before sending


class EmailType(str, enum.Enum):
    """Types of emails."""

    INVOICE = "invoice"  # Initial invoice send
    REMINDER = "reminder"  # Payment reminder
    RECEIPT = "receipt"  # Payment receipt
    CREDIT_NOTE = "credit_note"  # Credit note
    CUSTOM = "custom"  # Custom email


class EmailLog(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """Email delivery log with retry tracking."""

    __tablename__ = "email_logs"

    # Tenant
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        nullable=False,
        index=True,
    )

    # Invoice Reference
    invoice_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Email Type & Status
    email_type: Mapped[EmailType] = mapped_column(
        Enum(EmailType, name="email_type"),
        default=EmailType.INVOICE,
        nullable=False,
    )
    status: Mapped[EmailStatus] = mapped_column(
        Enum(EmailStatus, name="email_status"),
        default=EmailStatus.QUEUED,
        nullable=False,
        index=True,
    )

    # Email Details
    from_email: Mapped[str] = mapped_column(String(255), nullable=False)
    from_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reply_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    to_email: Mapped[str] = mapped_column(String(255), nullable=False)
    to_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Comma-separated
    bcc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Comma-separated

    # Content
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Attachments info (JSON array of {filename, size, content_type})
    attachments: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Retry Management
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    queued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    bounced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Error Tracking
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # External References (for tracking with email providers)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Reminder-specific tracking
    reminder_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationship
    invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice", back_populates="email_logs"
    )

    @property
    def can_retry(self) -> bool:
        """Check if email can be retried."""
        return (
            self.status in {EmailStatus.QUEUED, EmailStatus.FAILED}
            and self.retry_count < self.max_retries
        )

    @property
    def is_terminal_state(self) -> bool:
        """Check if email is in a terminal state."""
        return self.status in {
            EmailStatus.SENT,
            EmailStatus.DELIVERED,
            EmailStatus.BOUNCED,
            EmailStatus.CANCELLED,
        }
