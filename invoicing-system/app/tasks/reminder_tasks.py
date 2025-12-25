"""Reminder processing tasks."""

import asyncio
from typing import Optional

from celery import shared_task

from app.core.database import get_db_context
from app.services.reminder import ReminderService


@shared_task
def process_reminders(company_id: Optional[str] = None):
    """
    Process all due payment reminders.
    
    This task:
    1. Finds all invoices eligible for reminders
    2. Sends reminder emails for each
    3. Updates reminder tracking on invoices
    
    Runs daily (configured in Celery Beat).
    """
    async def _process():
        async with get_db_context() as db:
            service = ReminderService(db, company_id)
            results = await service.process_due_reminders()
            return {
                "processed": len(results),
                "results": results[:10],  # Return first 10 for logging
            }

    return asyncio.get_event_loop().run_until_complete(_process())


@shared_task
def send_reminder_now(invoice_id: str, company_id: str):
    """
    Send a reminder for a specific invoice immediately.
    
    Can be triggered manually via the API.
    """
    async def _send():
        from sqlalchemy import select
        from app.models.invoice import Invoice

        async with get_db_context() as db:
            # Get invoice
            stmt = select(Invoice).where(Invoice.id == invoice_id)
            result = await db.execute(stmt)
            invoice = result.scalar_one_or_none()

            if not invoice:
                return {"error": "Invoice not found"}

            # Get company for reminder settings
            from app.models.company import Company
            from sqlalchemy.orm import selectinload

            company_stmt = (
                select(Company)
                .options(selectinload(Company.settings))
                .where(Company.id == company_id)
            )
            company_result = await db.execute(company_stmt)
            company = company_result.scalar_one_or_none()

            if not company:
                return {"error": "Company not found"}

            # Send reminder
            service = ReminderService(db, company_id)
            from app.services.email import EmailService

            reminder_number = invoice.reminder_count + 1
            email_service = EmailService(db, company_id)
            email_log = await email_service.queue_reminder_email(
                invoice_id=invoice_id,
                reminder_number=reminder_number,
            )

            # Update invoice
            from datetime import datetime

            invoice.reminder_count = reminder_number
            invoice.last_reminder_sent_at = datetime.utcnow()

            return {
                "success": True,
                "email_id": email_log.id,
                "reminder_number": reminder_number,
            }

    return asyncio.get_event_loop().run_until_complete(_send())
