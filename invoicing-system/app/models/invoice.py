"""Invoice and invoice item models."""

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.customer import Customer
    from app.models.email import EmailLog
    from app.models.payment import Payment
    from app.models.token import InvoiceViewToken


class InvoiceType(str, enum.Enum):
    """Invoice types."""

    INVOICE = "invoice"
    CREDIT_NOTE = "credit_note"
    PROFORMA = "proforma"


class InvoiceStatus(str, enum.Enum):
    """Invoice status workflow."""

    DRAFT = "draft"  # Being edited
    SENT = "sent"  # Sent to customer
    VIEWED = "viewed"  # Customer viewed invoice
    PAYMENT_PENDING = "payment_pending"  # Payment initiated
    PAID = "paid"  # Payment received
    PARTIALLY_PAID = "partially_paid"  # Partial payment
    OVERDUE = "overdue"  # Past due date
    CANCELLED = "cancelled"  # Cancelled
    VOID = "void"  # Voided (for accounting)


# Valid status transitions
VALID_STATUS_TRANSITIONS = {
    InvoiceStatus.DRAFT: {InvoiceStatus.SENT, InvoiceStatus.CANCELLED},
    InvoiceStatus.SENT: {
        InvoiceStatus.VIEWED,
        InvoiceStatus.PAYMENT_PENDING,
        InvoiceStatus.PAID,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.VOID,
    },
    InvoiceStatus.VIEWED: {
        InvoiceStatus.PAYMENT_PENDING,
        InvoiceStatus.PAID,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.VOID,
    },
    InvoiceStatus.PAYMENT_PENDING: {
        InvoiceStatus.PAID,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.SENT,  # Payment failed
        InvoiceStatus.VOID,
    },
    InvoiceStatus.PARTIALLY_PAID: {
        InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.VOID,
    },
    InvoiceStatus.OVERDUE: {
        InvoiceStatus.PAYMENT_PENDING,
        InvoiceStatus.PAID,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.VOID,
    },
    InvoiceStatus.PAID: {InvoiceStatus.VOID},  # Only void for accounting adjustments
    InvoiceStatus.CANCELLED: set(),  # Terminal state
    InvoiceStatus.VOID: set(),  # Terminal state
}


class InvoiceNumberSequence(Base, UUIDMixin, TimestampMixin):
    """Invoice number sequence per company per year."""

    __tablename__ = "invoice_number_sequences"
    __table_args__ = (
        UniqueConstraint("company_id", "year", name="uq_company_year_sequence"),
    )

    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship
    company: Mapped["Company"] = relationship(
        "Company", back_populates="number_sequences"
    )


class Invoice(Base, UUIDMixin, TenantMixin, TimestampMixin, SoftDeleteMixin):
    """Invoice model with full lifecycle support."""

    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("company_id", "invoice_number", name="uq_company_invoice_number"),
    )

    # Tenant
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Customer
    customer_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Invoice Identity
    invoice_number: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # Format: YYYY-000001
    invoice_type: Mapped[InvoiceType] = mapped_column(
        Enum(InvoiceType, name="invoice_type"),
        default=InvoiceType.INVOICE,
        nullable=False,
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status"),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Credit Note Reference
    credited_invoice_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Dates
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Currency & Amounts (stored in cents for precision)
    currency: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, default=0)  # In cents
    total_vat: Mapped[int] = mapped_column(Integer, default=0)  # In cents
    total: Mapped[int] = mapped_column(Integer, default=0)  # In cents
    amount_paid: Mapped[int] = mapped_column(Integer, default=0)  # In cents

    # VAT breakdown stored as JSON
    vat_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Discount
    discount_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # 'percentage' or 'fixed'
    discount_value: Mapped[int] = mapped_column(Integer, default=0)
    discount_amount: Mapped[int] = mapped_column(Integer, default=0)

    # Content
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # PDF Storage (immutable after sending)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    pdf_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_pdf_final: Mapped[bool] = mapped_column(Boolean, default=False)

    # Payment Link
    payment_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    payment_link_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Reminder Tracking
    reminder_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_reminder_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Snapshot of customer data at invoice time (for immutability)
    customer_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Additional metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    po_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="invoices")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.position",
    )
    email_logs: Mapped[list["EmailLog"]] = relationship(
        "EmailLog", back_populates="invoice"
    )
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="invoice")
    view_tokens: Mapped[list["InvoiceViewToken"]] = relationship(
        "InvoiceViewToken", back_populates="invoice"
    )
    credited_invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice", remote_side="Invoice.id", foreign_keys=[credited_invoice_id]
    )

    @property
    def is_editable(self) -> bool:
        """Check if invoice can be edited."""
        return self.status == InvoiceStatus.DRAFT

    @property
    def is_sendable(self) -> bool:
        """Check if invoice can be sent."""
        return self.status == InvoiceStatus.DRAFT and len(self.items) > 0

    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue."""
        if self.status in {InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.VOID}:
            return False
        return date.today() > self.due_date

    @property
    def amount_due(self) -> int:
        """Calculate remaining amount due."""
        return max(0, self.total - self.amount_paid)

    @property
    def subtotal_decimal(self) -> Decimal:
        """Get subtotal as Decimal."""
        return Decimal(self.subtotal) / 100

    @property
    def total_vat_decimal(self) -> Decimal:
        """Get total VAT as Decimal."""
        return Decimal(self.total_vat) / 100

    @property
    def total_decimal(self) -> Decimal:
        """Get total as Decimal."""
        return Decimal(self.total) / 100

    def can_transition_to(self, new_status: InvoiceStatus) -> bool:
        """Check if status transition is valid."""
        return new_status in VALID_STATUS_TRANSITIONS.get(self.status, set())


class InvoiceItem(Base, UUIDMixin, TimestampMixin):
    """Invoice line item."""

    __tablename__ = "invoice_items"

    invoice_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Item Details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("1.0000"), nullable=False
    )
    unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # pcs, hours, etc.
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)  # In cents

    # VAT
    vat_rate: Mapped[int] = mapped_column(Integer, default=22)  # 0, 9, or 22

    # Discount on item
    discount_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    discount_value: Mapped[int] = mapped_column(Integer, default=0)

    # Calculated fields (stored for historical accuracy)
    line_subtotal: Mapped[int] = mapped_column(Integer, default=0)  # qty * unit_price
    line_discount: Mapped[int] = mapped_column(Integer, default=0)
    line_vat: Mapped[int] = mapped_column(Integer, default=0)
    line_total: Mapped[int] = mapped_column(Integer, default=0)

    # Ordering
    position: Mapped[int] = mapped_column(Integer, default=0)

    # Optional product/service reference
    product_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationship
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")

    @property
    def unit_price_decimal(self) -> Decimal:
        """Get unit price as Decimal."""
        return Decimal(self.unit_price) / 100

    @property
    def line_total_decimal(self) -> Decimal:
        """Get line total as Decimal."""
        return Decimal(self.line_total) / 100
