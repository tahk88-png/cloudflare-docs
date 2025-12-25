"""Audit log model for full system auditing."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import UUIDMixin


class AuditAction(str, enum.Enum):
    """Audit action types."""

    # Invoice Actions
    INVOICE_CREATED = "invoice.created"
    INVOICE_UPDATED = "invoice.updated"
    INVOICE_DELETED = "invoice.deleted"
    INVOICE_SENT = "invoice.sent"
    INVOICE_VIEWED = "invoice.viewed"
    INVOICE_PAID = "invoice.paid"
    INVOICE_VOIDED = "invoice.voided"
    INVOICE_CANCELLED = "invoice.cancelled"
    INVOICE_PDF_GENERATED = "invoice.pdf_generated"
    INVOICE_REMINDER_SENT = "invoice.reminder_sent"

    # Credit Note Actions
    CREDIT_NOTE_CREATED = "credit_note.created"
    CREDIT_NOTE_SENT = "credit_note.sent"

    # Payment Actions
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_REFUNDED = "payment.refunded"
    PAYMENT_FAILED = "payment.failed"

    # Customer Actions
    CUSTOMER_CREATED = "customer.created"
    CUSTOMER_UPDATED = "customer.updated"
    CUSTOMER_DELETED = "customer.deleted"

    # User Actions
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    USER_PASSWORD_CHANGED = "user.password_changed"

    # Company Actions
    COMPANY_UPDATED = "company.updated"
    COMPANY_SETTINGS_UPDATED = "company.settings_updated"

    # Email Actions
    EMAIL_QUEUED = "email.queued"
    EMAIL_SENT = "email.sent"
    EMAIL_BOUNCED = "email.bounced"
    EMAIL_FAILED = "email.failed"

    # System Actions
    SYSTEM_ERROR = "system.error"
    WEBHOOK_RECEIVED = "webhook.received"


class AuditLog(Base, UUIDMixin):
    """Immutable audit log entry."""

    __tablename__ = "audit_logs"

    # Timestamp (immutable)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Tenant Context
    company_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        nullable=True,
        index=True,
    )

    # Actor (who performed the action)
    user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        nullable=True,
        index=True,
    )
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    actor_type: Mapped[str] = mapped_column(
        String(50), default="user"
    )  # user, system, webhook, api_key

    # Action Details
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, name="audit_action"),
        nullable=False,
        index=True,
    )
    action_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Entity Reference
    entity_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # invoice, customer, user, etc.
    entity_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), nullable=True, index=True
    )
    entity_identifier: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # Human-readable identifier (e.g., invoice number)

    # Change Details
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    changes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Request Context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Additional Context
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Note: This table should be append-only, never updated or deleted


class AuditLogMixin:
    """Mixin to add audit logging capability to services."""

    @staticmethod
    def create_audit_entry(
        action: AuditAction,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        actor_type: str = "user",
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_identifier: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        changes: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        action_description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> AuditLog:
        """Create an audit log entry."""
        return AuditLog(
            action=action,
            company_id=company_id,
            user_id=user_id,
            user_email=user_email,
            actor_type=actor_type,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_identifier=entity_identifier,
            old_values=old_values,
            new_values=new_values,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            action_description=action_description,
            metadata=metadata,
        )
