"""Reminder service for automated payment reminders."""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.company import Company, CompanySettings
from app.models.customer import Customer, CustomerReminderSettings
from app.models.email import EmailLog, EmailType
from app.models.invoice import Invoice, InvoiceStatus
from app.services.email import EmailService


class ReminderService:
    """Service for managing automated payment reminders."""

    def __init__(self, db: AsyncSession, company_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id

    async def process_due_reminders(self) -> list[dict]:
        """
        Process all invoices due for reminders.
        
        Called periodically by a scheduler (e.g., Celery beat).
        Returns list of processed reminders with status.
        """
        results = []

        # Get all companies (or specific company if set)
        if self.company_id:
            companies = [await self._get_company(self.company_id)]
        else:
            stmt = (
                select(Company)
                .options(selectinload(Company.settings))
                .where(
                    Company.is_active == True,
                    Company.deleted_at.is_(None),
                )
            )
            result = await self.db.execute(stmt)
            companies = list(result.scalars().all())

        for company in companies:
            company_results = await self._process_company_reminders(company)
            results.extend(company_results)

        return results

    async def _process_company_reminders(self, company: Company) -> list[dict]:
        """Process reminders for a specific company."""
        results = []

        # Get company reminder settings
        reminder_settings = company.settings
        if not reminder_settings or not reminder_settings.reminders_enabled:
            return results

        reminder_days = reminder_settings.reminder_days or settings.DEFAULT_REMINDER_DAYS
        max_reminders = reminder_settings.max_reminders or 3

        # Get invoices eligible for reminders
        invoices = await self._get_invoices_for_reminders(
            company.id, reminder_days, max_reminders
        )

        for invoice in invoices:
            try:
                result = await self._send_reminder(
                    company, invoice, reminder_settings
                )
                results.append(result)
            except Exception as e:
                results.append({
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "status": "error",
                    "error": str(e),
                })

        return results

    async def _get_invoices_for_reminders(
        self,
        company_id: str,
        reminder_days: list[int],
        max_reminders: int,
    ) -> list[Invoice]:
        """Get invoices that are due for a reminder."""
        today = date.today()

        # Invoices must be:
        # - Status: SENT, VIEWED, or OVERDUE
        # - Past due date
        # - Haven't reached max reminders
        # - Reminders are enabled
        # - Either no reminder sent today, or scheduled for today
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.customer).selectinload(Customer.reminder_settings)
            )
            .where(
                and_(
                    Invoice.company_id == company_id,
                    Invoice.status.in_([
                        InvoiceStatus.SENT,
                        InvoiceStatus.VIEWED,
                        InvoiceStatus.OVERDUE,
                    ]),
                    Invoice.due_date < today,
                    Invoice.reminder_count < max_reminders,
                    Invoice.reminders_enabled == True,
                    Invoice.deleted_at.is_(None),
                    or_(
                        Invoice.next_reminder_date.is_(None),
                        Invoice.next_reminder_date <= today,
                    ),
                )
            )
        )
        result = await self.db.execute(stmt)
        invoices = list(result.scalars().all())

        # Filter based on reminder schedule
        eligible_invoices = []
        for invoice in invoices:
            if self._should_send_reminder(invoice, reminder_days, today):
                eligible_invoices.append(invoice)

        return eligible_invoices

    def _should_send_reminder(
        self,
        invoice: Invoice,
        company_reminder_days: list[int],
        today: date,
    ) -> bool:
        """Determine if a reminder should be sent for this invoice."""
        # Get customer-specific settings if available
        customer_settings = None
        if invoice.customer and invoice.customer.reminder_settings:
            customer_settings = invoice.customer.reminder_settings
            if not customer_settings.reminders_enabled:
                return False

        # Use customer-specific or company reminder days
        reminder_days = (
            customer_settings.reminder_days
            if customer_settings and customer_settings.reminder_days
            else company_reminder_days
        )

        # Calculate days overdue
        days_overdue = (today - invoice.due_date).days

        # Determine which reminder number this would be
        next_reminder = invoice.reminder_count + 1

        # Check if we've passed the threshold for this reminder
        if next_reminder <= len(reminder_days):
            threshold = reminder_days[next_reminder - 1]
            return days_overdue >= threshold

        return False

    async def _send_reminder(
        self,
        company: Company,
        invoice: Invoice,
        settings: CompanySettings,
    ) -> dict:
        """Send a reminder for a specific invoice."""
        reminder_number = invoice.reminder_count + 1

        # Create email service
        email_service = EmailService(self.db, company.id)

        # Queue reminder email
        email_log = await email_service.queue_reminder_email(
            invoice_id=invoice.id,
            reminder_number=reminder_number,
        )

        # Update invoice reminder tracking
        invoice.reminder_count = reminder_number
        invoice.last_reminder_sent_at = datetime.utcnow()

        # Calculate next reminder date
        reminder_days = settings.reminder_days or [7, 14, 30]
        if reminder_number < len(reminder_days):
            next_days = reminder_days[reminder_number]
            # Calculate from due date
            invoice.next_reminder_date = invoice.due_date + timedelta(days=next_days)
        else:
            invoice.next_reminder_date = None  # No more reminders

        # Update customer reminder stats if tracking enabled
        if invoice.customer and invoice.customer.reminder_settings:
            customer_settings = invoice.customer.reminder_settings
            customer_settings.last_reminder_sent_at = datetime.utcnow()
            customer_settings.total_reminders_sent += 1

        # Update invoice status to overdue if not already
        if invoice.status != InvoiceStatus.OVERDUE:
            invoice.status = InvoiceStatus.OVERDUE

        await self.db.flush()

        return {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "reminder_number": reminder_number,
            "email_id": email_log.id,
            "status": "queued",
        }

    async def schedule_reminder(
        self,
        invoice_id: str,
        reminder_date: date,
    ) -> Invoice:
        """Manually schedule a reminder for a specific date."""
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        invoice.next_reminder_date = reminder_date

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=invoice.company_id,
            action=AuditAction.INVOICE_UPDATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            metadata={
                "action": "schedule_reminder",
                "reminder_date": str(reminder_date),
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    async def disable_reminders(self, invoice_id: str) -> Invoice:
        """Disable reminders for an invoice."""
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        invoice.reminders_enabled = False
        invoice.next_reminder_date = None

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=invoice.company_id,
            action=AuditAction.INVOICE_UPDATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            metadata={"action": "disable_reminders"},
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    async def enable_reminders(self, invoice_id: str) -> Invoice:
        """Enable reminders for an invoice."""
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        invoice.reminders_enabled = True

        # Calculate next reminder date based on current status
        company = await self._get_company(invoice.company_id)
        if company.settings:
            reminder_days = company.settings.reminder_days or [7, 14, 30]
            if invoice.reminder_count < len(reminder_days):
                next_days = reminder_days[invoice.reminder_count]
                invoice.next_reminder_date = invoice.due_date + timedelta(days=next_days)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=invoice.company_id,
            action=AuditAction.INVOICE_UPDATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            metadata={"action": "enable_reminders"},
        )
        self.db.add(audit_log)

        await self.db.flush()
        return invoice

    async def get_reminder_history(
        self,
        invoice_id: str,
    ) -> list[EmailLog]:
        """Get reminder email history for an invoice."""
        stmt = (
            select(EmailLog)
            .where(
                and_(
                    EmailLog.invoice_id == invoice_id,
                    EmailLog.email_type == EmailType.REMINDER,
                )
            )
            .order_by(EmailLog.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_company(self, company_id: str) -> Company:
        """Get company with settings."""
        stmt = (
            select(Company)
            .options(selectinload(Company.settings))
            .where(Company.id == company_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
