"""Invoice schemas for API validation."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import Field, field_validator

from app.models.invoice import InvoiceStatus, InvoiceType
from app.schemas.base import BaseSchema, PaginatedResponse, TimestampSchema


class InvoiceItemCreate(BaseSchema):
    """Schema for creating invoice items."""

    description: str = Field(..., min_length=1, max_length=1000)
    quantity: Decimal = Field(default=Decimal("1.0000"), ge=0)
    unit: Optional[str] = Field(default="pcs", max_length=20)
    unit_price: int = Field(..., ge=0, description="Price in cents")
    vat_rate: int = Field(default=22, ge=0, le=100)
    discount_type: Optional[str] = Field(default=None, pattern="^(percentage|fixed)$")
    discount_value: int = Field(default=0, ge=0)
    position: Optional[int] = Field(default=None, ge=0)
    product_id: Optional[str] = Field(default=None, max_length=100)
    product_code: Optional[str] = Field(default=None, max_length=50)


class InvoiceItemUpdate(BaseSchema):
    """Schema for updating invoice items."""

    description: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    quantity: Optional[Decimal] = Field(default=None, ge=0)
    unit: Optional[str] = Field(default=None, max_length=20)
    unit_price: Optional[int] = Field(default=None, ge=0)
    vat_rate: Optional[int] = Field(default=None, ge=0, le=100)
    discount_type: Optional[str] = Field(default=None, pattern="^(percentage|fixed)$")
    discount_value: Optional[int] = Field(default=None, ge=0)
    position: Optional[int] = Field(default=None, ge=0)


class InvoiceItemResponse(TimestampSchema):
    """Schema for invoice item response."""

    id: str
    invoice_id: str
    description: str
    quantity: Decimal
    unit: Optional[str]
    unit_price: int
    vat_rate: int
    discount_type: Optional[str]
    discount_value: int
    line_subtotal: int
    line_discount: int
    line_vat: int
    line_total: int
    position: int
    product_id: Optional[str]
    product_code: Optional[str]

    # Computed fields
    unit_price_decimal: Decimal
    line_total_decimal: Decimal


class InvoiceCreate(BaseSchema):
    """Schema for creating an invoice."""

    customer_id: str
    invoice_type: InvoiceType = InvoiceType.INVOICE
    issue_date: Optional[date] = None  # Defaults to today
    due_date: Optional[date] = None  # Defaults based on customer/company settings
    currency: str = Field(default="EUR", pattern="^[A-Z]{3}$")

    # Optional fields
    title: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)
    terms: Optional[str] = Field(default=None, max_length=5000)
    footer: Optional[str] = Field(default=None, max_length=1000)
    reference: Optional[str] = Field(default=None, max_length=100)
    po_number: Optional[str] = Field(default=None, max_length=100)

    # Discount on entire invoice
    discount_type: Optional[str] = Field(default=None, pattern="^(percentage|fixed)$")
    discount_value: int = Field(default=0, ge=0)

    # Items
    items: list[InvoiceItemCreate] = Field(default_factory=list)

    # Credit note reference
    credited_invoice_id: Optional[str] = None

    # Reminder settings
    reminders_enabled: bool = True

    # Additional metadata
    metadata: Optional[dict] = None

    @field_validator("due_date")
    @classmethod
    def due_date_after_issue(cls, v, info):
        if v and info.data.get("issue_date") and v < info.data["issue_date"]:
            raise ValueError("Due date must be on or after issue date")
        return v


class InvoiceUpdate(BaseSchema):
    """Schema for updating an invoice (draft only)."""

    customer_id: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = Field(default=None, pattern="^[A-Z]{3}$")
    title: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)
    terms: Optional[str] = Field(default=None, max_length=5000)
    footer: Optional[str] = Field(default=None, max_length=1000)
    reference: Optional[str] = Field(default=None, max_length=100)
    po_number: Optional[str] = Field(default=None, max_length=100)
    discount_type: Optional[str] = Field(default=None, pattern="^(percentage|fixed)$")
    discount_value: Optional[int] = Field(default=None, ge=0)
    items: Optional[list[InvoiceItemCreate]] = None
    reminders_enabled: Optional[bool] = None
    metadata: Optional[dict] = None


class InvoiceResponse(TimestampSchema):
    """Schema for invoice response."""

    id: str
    company_id: str
    customer_id: str
    invoice_number: str
    invoice_type: InvoiceType
    status: InvoiceStatus

    # Dates
    issue_date: date
    due_date: date
    sent_at: Optional[datetime]
    paid_at: Optional[datetime]

    # Amounts
    currency: str
    subtotal: int
    total_vat: int
    total: int
    amount_paid: int
    discount_type: Optional[str]
    discount_value: int
    discount_amount: int

    # VAT breakdown
    vat_breakdown: Optional[dict]

    # Content
    title: Optional[str]
    notes: Optional[str]
    terms: Optional[str]
    footer: Optional[str]
    reference: Optional[str]
    po_number: Optional[str]

    # PDF
    pdf_url: Optional[str]
    pdf_sha256: Optional[str]
    pdf_generated_at: Optional[datetime]
    is_pdf_final: bool

    # Payment
    payment_link: Optional[str]
    payment_link_expires_at: Optional[datetime]

    # Reminders
    reminder_count: int
    last_reminder_sent_at: Optional[datetime]
    next_reminder_date: Optional[date]
    reminders_enabled: bool

    # Credit note reference
    credited_invoice_id: Optional[str]

    # Additional
    metadata: Optional[dict]

    # Items
    items: list[InvoiceItemResponse] = []

    # Computed properties
    is_editable: bool
    is_sendable: bool
    is_overdue: bool
    amount_due: int
    subtotal_decimal: Decimal
    total_vat_decimal: Decimal
    total_decimal: Decimal


class InvoiceListResponse(PaginatedResponse):
    """Paginated list of invoices."""

    items: list[InvoiceResponse]


class InvoiceSummary(BaseSchema):
    """Summary statistics for invoices."""

    total_invoices: int
    total_draft: int
    total_sent: int
    total_paid: int
    total_overdue: int
    total_amount: int
    total_paid_amount: int
    total_outstanding: int
    currency: str


class GeneratePDFRequest(BaseSchema):
    """Request to generate PDF."""

    template_id: Optional[str] = None
    force_regenerate: bool = False


class GeneratePDFResponse(BaseSchema):
    """Response from PDF generation."""

    pdf_url: str
    pdf_sha256: str
    is_draft: bool
    generated_at: datetime


class SendEmailRequest(BaseSchema):
    """Request to send invoice email."""

    to_email: Optional[str] = None  # Defaults to customer email
    cc: Optional[list[str]] = None
    bcc: Optional[list[str]] = None
    subject: Optional[str] = None  # Defaults to template
    message: Optional[str] = None  # Custom message
    include_payment_link: bool = True
    generate_fresh_pdf: bool = False


class SendEmailResponse(BaseSchema):
    """Response from sending email."""

    email_id: str
    status: str
    sent_to: str
    queued_at: datetime
