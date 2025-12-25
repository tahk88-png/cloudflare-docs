"""Company schemas for API validation."""

from typing import Optional

from pydantic import EmailStr, Field, HttpUrl

from app.schemas.base import BaseSchema, TimestampSchema


class CompanySettingsCreate(BaseSchema):
    """Schema for creating company settings."""

    default_currency: str = Field(default="EUR", pattern="^[A-Z]{3}$")
    default_vat_rate: int = Field(default=22, ge=0, le=100)
    available_vat_rates: list[int] = Field(default=[0, 9, 22])
    invoice_prefix: Optional[str] = Field(default=None, max_length=10)
    invoice_due_days: int = Field(default=14, ge=0, le=365)

    email_from_name: Optional[str] = Field(default=None, max_length=100)
    email_reply_to: Optional[EmailStr] = None

    bank_name: Optional[str] = Field(default=None, max_length=100)
    bank_account_number: Optional[str] = Field(default=None, max_length=50)
    bank_iban: Optional[str] = Field(default=None, max_length=50)
    bank_swift: Optional[str] = Field(default=None, max_length=20)

    stripe_enabled: bool = False
    stripe_account_id: Optional[str] = Field(default=None, max_length=100)
    montonio_enabled: bool = False
    montonio_store_uuid: Optional[str] = Field(default=None, max_length=100)

    reminders_enabled: bool = True
    reminder_days: list[int] = Field(default=[7, 14, 30])
    max_reminders: int = Field(default=3, ge=0, le=10)

    pdf_footer_text: Optional[str] = Field(default=None, max_length=1000)
    pdf_terms_text: Optional[str] = Field(default=None, max_length=5000)


class CompanySettingsResponse(TimestampSchema):
    """Schema for company settings response."""

    id: str
    company_id: str
    default_currency: str
    default_vat_rate: int
    available_vat_rates: list[int]
    invoice_prefix: Optional[str]
    invoice_due_days: int

    email_from_name: Optional[str]
    email_reply_to: Optional[str]

    bank_name: Optional[str]
    bank_account_number: Optional[str]
    bank_iban: Optional[str]
    bank_swift: Optional[str]

    stripe_enabled: bool
    montonio_enabled: bool

    reminders_enabled: bool
    reminder_days: list[int]
    max_reminders: int

    pdf_footer_text: Optional[str]
    pdf_terms_text: Optional[str]


class CompanyCreate(BaseSchema):
    """Schema for creating a company."""

    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    vat_number: Optional[str] = Field(default=None, max_length=50)

    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    website: Optional[str] = Field(default=None, max_length=255)

    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: str = Field(default="EE", pattern="^[A-Z]{2}$")

    logo_url: Optional[str] = Field(default=None, max_length=500)
    primary_color: Optional[str] = Field(default="#2563eb", pattern="^#[0-9A-Fa-f]{6}$")

    settings: Optional[CompanySettingsCreate] = None


class CompanyUpdate(BaseSchema):
    """Schema for updating a company."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    legal_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    vat_number: Optional[str] = Field(default=None, max_length=50)

    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    website: Optional[str] = Field(default=None, max_length=255)

    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: Optional[str] = Field(default=None, pattern="^[A-Z]{2}$")

    logo_url: Optional[str] = Field(default=None, max_length=500)
    primary_color: Optional[str] = Field(default=None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None

    settings: Optional[CompanySettingsCreate] = None


class CompanyResponse(TimestampSchema):
    """Schema for company response."""

    id: str
    name: str
    legal_name: Optional[str]
    registration_number: Optional[str]
    vat_number: Optional[str]

    email: str
    phone: Optional[str]
    website: Optional[str]

    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    country: str

    logo_url: Optional[str]
    primary_color: Optional[str]
    is_active: bool

    settings: Optional[CompanySettingsResponse] = None
