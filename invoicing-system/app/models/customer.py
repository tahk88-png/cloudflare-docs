"""Customer model with reminder settings."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.invoice import Invoice


class Customer(Base, UUIDMixin, TenantMixin, TimestampMixin, SoftDeleteMixin):
    """Customer model."""

    __tablename__ = "customers"

    # Company relationship
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic Info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vat_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Contact Info
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="EE")

    # Billing Defaults
    default_currency: Mapped[str] = mapped_column(String(3), default="EUR")
    default_payment_terms_days: Mapped[int] = mapped_column(Integer, default=14)
    default_vat_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Additional data as JSON
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="customers")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="customer")
    reminder_settings: Mapped[Optional["CustomerReminderSettings"]] = relationship(
        "CustomerReminderSettings", back_populates="customer", uselist=False
    )

    @property
    def full_address(self) -> str:
        """Get formatted full address."""
        parts = [
            self.address_line1,
            self.address_line2,
            f"{self.postal_code} {self.city}".strip() if self.city else None,
            self.state,
            self.country,
        ]
        return ", ".join(p for p in parts if p)


class CustomerReminderSettings(Base, UUIDMixin, TimestampMixin):
    """Customer-specific reminder settings."""

    __tablename__ = "customer_reminder_settings"

    customer_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("customers.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Override company defaults
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reminder_days: Mapped[Optional[list[int]]] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    max_reminders: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Custom email for reminders
    reminder_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Tracking
    last_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_reminders_sent: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship
    customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="reminder_settings"
    )
