"""Company and company settings models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.invoice import Invoice, InvoiceNumberSequence
    from app.models.template import InvoiceTemplate
    from app.models.user import User


class Company(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Company/tenant model."""

    __tablename__ = "companies"

    # Basic Info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vat_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Contact Info
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="EE")  # ISO country code

    # Branding
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[Optional[str]] = mapped_column(String(7), default="#2563eb")

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="company")
    customers: Mapped[list["Customer"]] = relationship("Customer", back_populates="company")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="company")
    templates: Mapped[list["InvoiceTemplate"]] = relationship(
        "InvoiceTemplate", back_populates="company"
    )
    settings: Mapped[Optional["CompanySettings"]] = relationship(
        "CompanySettings", back_populates="company", uselist=False
    )
    number_sequences: Mapped[list["InvoiceNumberSequence"]] = relationship(
        "InvoiceNumberSequence", back_populates="company"
    )


class CompanySettings(Base, UUIDMixin, TimestampMixin):
    """Company-specific settings."""

    __tablename__ = "company_settings"

    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Invoice Settings
    default_currency: Mapped[str] = mapped_column(String(3), default="EUR")
    default_vat_rate: Mapped[int] = mapped_column(Integer, default=22)
    available_vat_rates: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), default=[0, 9, 22]
    )
    invoice_prefix: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    invoice_due_days: Mapped[int] = mapped_column(Integer, default=14)

    # Email Settings
    email_from_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email_reply_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Payment Settings
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_iban: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_swift: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Payment Provider Settings
    stripe_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    montonio_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    montonio_store_uuid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Reminder Settings
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reminder_days: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), default=[7, 14, 30]
    )
    max_reminders: Mapped[int] = mapped_column(Integer, default=3)

    # PDF Settings
    default_template_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), nullable=True
    )
    pdf_footer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_terms_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Additional Settings as JSON
    extra_settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationship
    company: Mapped["Company"] = relationship("Company", back_populates="settings")
