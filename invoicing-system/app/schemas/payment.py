"""Payment schemas for API validation."""

from datetime import datetime
from typing import Any, Optional

from pydantic import Field

from app.models.payment import PaymentMethod, PaymentProvider, PaymentStatus
from app.schemas.base import BaseSchema, PaginatedResponse, TimestampSchema


class PaymentCreate(BaseSchema):
    """Schema for creating a manual payment."""

    invoice_id: str
    amount: int = Field(..., gt=0, description="Amount in cents")
    currency: str = Field(default="EUR", pattern="^[A-Z]{3}$")
    provider: PaymentProvider = PaymentProvider.MANUAL
    method: Optional[PaymentMethod] = PaymentMethod.BANK_TRANSFER
    external_reference: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=1000)


class PaymentResponse(TimestampSchema):
    """Schema for payment response."""

    id: str
    company_id: str
    invoice_id: str
    provider: PaymentProvider
    status: PaymentStatus
    method: Optional[PaymentMethod]

    amount: int
    currency: str
    fee: int
    refunded_amount: int

    external_id: Optional[str]
    external_reference: Optional[str]
    checkout_session_id: Optional[str]

    payment_url: Optional[str]
    payment_url_expires_at: Optional[datetime]

    initiated_at: datetime
    completed_at: Optional[datetime]
    failed_at: Optional[datetime]

    failure_reason: Optional[str]
    failure_code: Optional[str]

    notes: Optional[str]

    is_successful: bool
    net_amount: int
    is_refundable: bool


class PaymentListResponse(PaginatedResponse):
    """Paginated list of payments."""

    items: list[PaymentResponse]


class CreatePaymentLinkRequest(BaseSchema):
    """Request to create a payment link."""

    provider: PaymentProvider = PaymentProvider.STRIPE
    expires_in_hours: int = Field(default=72, ge=1, le=720)
    include_fee: bool = False  # Whether to add payment fee to amount


class CreatePaymentLinkResponse(BaseSchema):
    """Response from creating payment link."""

    payment_id: str
    payment_url: str
    expires_at: datetime
    provider: PaymentProvider


class RefundRequest(BaseSchema):
    """Request to refund a payment."""

    amount: Optional[int] = Field(
        default=None, gt=0, description="Amount to refund in cents (default: full amount)"
    )
    reason: Optional[str] = Field(default=None, max_length=500)


class WebhookPayload(BaseSchema):
    """Generic webhook payload."""

    provider: PaymentProvider
    event_type: str
    event_id: str
    data: dict[str, Any]
    timestamp: datetime
    signature: Optional[str] = None


class StripeWebhookEvent(BaseSchema):
    """Stripe-specific webhook event."""

    id: str
    type: str
    data: dict[str, Any]
    created: int
    livemode: bool


class MontonioWebhookEvent(BaseSchema):
    """Montonio-specific webhook event."""

    uuid: str
    status: str
    payment_method: Optional[str] = None
    amount: float
    currency: str
    merchant_reference: str
    access_key: str
