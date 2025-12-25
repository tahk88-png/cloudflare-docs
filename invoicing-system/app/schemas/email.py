"""Email schemas for API validation."""

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from app.models.email import EmailStatus, EmailType
from app.schemas.base import BaseSchema, PaginatedResponse, TimestampSchema


class EmailLogResponse(TimestampSchema):
    """Schema for email log response."""

    id: str
    company_id: str
    invoice_id: Optional[str]
    email_type: EmailType
    status: EmailStatus

    from_email: str
    from_name: Optional[str]
    reply_to: Optional[str]
    to_email: str
    to_name: Optional[str]
    cc: Optional[str]
    bcc: Optional[str]

    subject: str

    retry_count: int
    max_retries: int
    next_retry_at: Optional[datetime]

    queued_at: datetime
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    bounced_at: Optional[datetime]
    failed_at: Optional[datetime]

    last_error: Optional[str]
    external_id: Optional[str]
    message_id: Optional[str]
    reminder_number: Optional[int]

    can_retry: bool
    is_terminal_state: bool


class EmailLogListResponse(PaginatedResponse):
    """Paginated list of email logs."""

    items: list[EmailLogResponse]


class SendCustomEmailRequest(BaseSchema):
    """Request to send a custom email."""

    to_email: EmailStr
    to_name: Optional[str] = Field(default=None, max_length=255)
    cc: Optional[list[EmailStr]] = None
    bcc: Optional[list[EmailStr]] = None
    subject: str = Field(..., min_length=1, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    attachments: Optional[list[dict]] = None


class RetryEmailRequest(BaseSchema):
    """Request to retry a failed email."""

    force: bool = False  # Retry even if max retries reached
