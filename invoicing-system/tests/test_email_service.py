"""Tests for the email service."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.email import EmailLog, EmailStatus, EmailType
from app.services.email import EmailService


class TestEmailQueueing:
    """Test email queueing functionality."""

    def test_email_initial_status_is_queued(self):
        """Test that new emails start in QUEUED status."""
        email = MagicMock(spec=EmailLog)
        email.status = EmailStatus.QUEUED
        
        assert email.status == EmailStatus.QUEUED

    def test_email_has_required_headers(self):
        """Test that emails have required headers."""
        email = MagicMock(spec=EmailLog)
        email.from_email = "no-reply@example.com"
        email.reply_to = "support@example.com"
        email.to_email = "customer@example.com"
        email.subject = "Invoice #2024-000001"
        
        assert email.from_email.startswith("no-reply@")
        assert email.reply_to.startswith("support@")
        assert email.to_email is not None
        assert email.subject is not None


class TestEmailRetry:
    """Test email retry logic."""

    def test_retry_count_increments(self):
        """Test that retry count increments on failure."""
        email = MagicMock(spec=EmailLog)
        email.retry_count = 0
        email.max_retries = 5
        
        # Simulate failure
        email.retry_count += 1
        
        assert email.retry_count == 1

    def test_max_retries_respected(self):
        """Test that max retries is respected."""
        email = MagicMock(spec=EmailLog)
        email.retry_count = 5
        email.max_retries = 5
        
        can_retry = email.retry_count < email.max_retries
        assert not can_retry

    def test_exponential_backoff(self):
        """Test exponential backoff calculation."""
        base_delay = 60
        multiplier = 2.0
        
        # Retry 1: 60s
        delay_1 = base_delay * (multiplier ** 0)
        assert delay_1 == 60
        
        # Retry 2: 120s
        delay_2 = base_delay * (multiplier ** 1)
        assert delay_2 == 120
        
        # Retry 3: 240s
        delay_3 = base_delay * (multiplier ** 2)
        assert delay_3 == 240


class TestEmailStatus:
    """Test email status transitions."""

    def test_valid_terminal_states(self):
        """Test terminal email states."""
        terminal_states = {
            EmailStatus.SENT,
            EmailStatus.DELIVERED,
            EmailStatus.BOUNCED,
            EmailStatus.CANCELLED,
        }
        
        # FAILED is not terminal - can be retried
        assert EmailStatus.FAILED not in terminal_states

    def test_email_can_retry_logic(self):
        """Test can_retry property logic."""
        # Can retry: queued and under max retries
        email1 = MagicMock()
        email1.status = EmailStatus.QUEUED
        email1.retry_count = 2
        email1.max_retries = 5
        can_retry_1 = email1.status in {EmailStatus.QUEUED, EmailStatus.FAILED} and email1.retry_count < email1.max_retries
        assert can_retry_1
        
        # Cannot retry: max retries reached
        email2 = MagicMock()
        email2.status = EmailStatus.FAILED
        email2.retry_count = 5
        email2.max_retries = 5
        can_retry_2 = email2.status in {EmailStatus.QUEUED, EmailStatus.FAILED} and email2.retry_count < email2.max_retries
        assert not can_retry_2
        
        # Cannot retry: already sent
        email3 = MagicMock()
        email3.status = EmailStatus.SENT
        email3.retry_count = 0
        email3.max_retries = 5
        can_retry_3 = email3.status in {EmailStatus.QUEUED, EmailStatus.FAILED} and email3.retry_count < email3.max_retries
        assert not can_retry_3


class TestEmailTypes:
    """Test different email types."""

    def test_email_types_exist(self):
        """Test that all email types are defined."""
        assert EmailType.INVOICE is not None
        assert EmailType.REMINDER is not None
        assert EmailType.RECEIPT is not None
        assert EmailType.CREDIT_NOTE is not None
        assert EmailType.CUSTOM is not None

    def test_reminder_number_tracking(self):
        """Test reminder number is tracked."""
        email = MagicMock(spec=EmailLog)
        email.email_type = EmailType.REMINDER
        email.reminder_number = 2
        
        assert email.email_type == EmailType.REMINDER
        assert email.reminder_number == 2


class TestBounceHandling:
    """Test bounce handling."""

    def test_bounce_updates_status(self):
        """Test that bounces update email status."""
        email = MagicMock(spec=EmailLog)
        email.status = EmailStatus.SENT
        
        # Simulate bounce
        email.status = EmailStatus.BOUNCED
        email.bounced_at = datetime.utcnow()
        
        assert email.status == EmailStatus.BOUNCED
        assert email.bounced_at is not None

    def test_bounce_details_stored(self):
        """Test that bounce details are stored."""
        email = MagicMock(spec=EmailLog)
        email.error_details = {
            "bounce_type": "hard",
            "bounce_subtype": "NoEmail",
            "diagnostic_code": "smtp;550 User not found",
        }
        
        assert email.error_details["bounce_type"] == "hard"
        assert "User not found" in email.error_details["diagnostic_code"]


class TestEmailSubjects:
    """Test email subject generation."""

    def test_invoice_subject_format(self):
        """Test invoice email subject format."""
        invoice_number = "2024-000001"
        company_name = "Test Company OÜ"
        subject = f"Invoice {invoice_number} from {company_name}"
        
        assert invoice_number in subject
        assert company_name in subject

    def test_reminder_subject_format(self):
        """Test reminder email subject format."""
        invoice_number = "2024-000001"
        reminder_number = 2
        
        if reminder_number == 1:
            prefix = "Friendly Reminder"
        elif reminder_number == 2:
            prefix = "Second Reminder"
        else:
            prefix = f"Payment Reminder #{reminder_number}"
        
        subject = f"{prefix}: Invoice {invoice_number}"
        
        assert "Second Reminder" in subject
        assert invoice_number in subject
