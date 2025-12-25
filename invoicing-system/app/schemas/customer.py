"""Customer schemas for API validation."""

from typing import Optional

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema, PaginatedResponse, TimestampSchema


class CustomerReminderSettingsCreate(BaseSchema):
    """Schema for customer reminder settings."""

    reminders_enabled: bool = True
    reminder_days: Optional[list[int]] = None
    max_reminders: Optional[int] = None
    reminder_email: Optional[str] = None


class CustomerReminderSettingsResponse(TimestampSchema):
    """Schema for customer reminder settings response."""

    id: str
    customer_id: str
    reminders_enabled: bool
    reminder_days: Optional[list[int]]
    max_reminders: Optional[int]
    reminder_email: Optional[str]
    total_reminders_sent: int


class CustomerCreate(BaseSchema):
    """Schema for creating a customer."""

    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    vat_number: Optional[str] = Field(default=None, max_length=50)

    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    contact_person: Optional[str] = Field(default=None, max_length=255)

    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: str = Field(default="EE", pattern="^[A-Z]{2}$")

    default_currency: str = Field(default="EUR", pattern="^[A-Z]{3}$")
    default_payment_terms_days: int = Field(default=14, ge=0, le=365)
    default_vat_rate: Optional[int] = Field(default=None, ge=0, le=100)

    notes: Optional[str] = Field(default=None, max_length=5000)
    metadata: Optional[dict] = None

    reminder_settings: Optional[CustomerReminderSettingsCreate] = None


class CustomerUpdate(BaseSchema):
    """Schema for updating a customer."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    legal_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    vat_number: Optional[str] = Field(default=None, max_length=50)

    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    contact_person: Optional[str] = Field(default=None, max_length=255)

    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    country: Optional[str] = Field(default=None, pattern="^[A-Z]{2}$")

    default_currency: Optional[str] = Field(default=None, pattern="^[A-Z]{3}$")
    default_payment_terms_days: Optional[int] = Field(default=None, ge=0, le=365)
    default_vat_rate: Optional[int] = Field(default=None, ge=0, le=100)

    notes: Optional[str] = Field(default=None, max_length=5000)
    is_active: Optional[bool] = None
    metadata: Optional[dict] = None

    reminder_settings: Optional[CustomerReminderSettingsCreate] = None


class CustomerResponse(TimestampSchema):
    """Schema for customer response."""

    id: str
    company_id: str
    name: str
    legal_name: Optional[str]
    registration_number: Optional[str]
    vat_number: Optional[str]

    email: str
    phone: Optional[str]
    contact_person: Optional[str]

    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    country: str

    default_currency: str
    default_payment_terms_days: int
    default_vat_rate: Optional[int]

    notes: Optional[str]
    is_active: bool
    metadata: Optional[dict]

    full_address: str

    reminder_settings: Optional[CustomerReminderSettingsResponse] = None


class CustomerListResponse(PaginatedResponse):
    """Paginated list of customers."""

    items: list[CustomerResponse]
