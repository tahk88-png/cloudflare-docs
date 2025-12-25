"""Email processing tasks."""

import asyncio
from datetime import datetime

from celery import shared_task
from sqlalchemy import and_, or_, select

from app.core.database import get_db_context
from app.models.email import EmailLog, EmailStatus
from app.services.email import EmailService


@shared_task(bind=True, max_retries=3)
def send_email_task(self, email_id: str, company_id: str):
    """
    Send a single email.
    
    This task is called when an email needs to be sent immediately
    or when retrying a failed email.
    """
    async def _send():
        async with get_db_context() as db:
            service = EmailService(db, company_id)
            try:
                success = await service.process_email(email_id)
                return success
            except Exception as e:
                # Log the error and potentially retry
                raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

    return asyncio.get_event_loop().run_until_complete(_send())


@shared_task
def process_email_queue():
    """
    Process all queued emails.
    
    This task runs periodically to send emails that are:
    - In QUEUED status
    - Past their scheduled retry time (if retrying)
    """
    async def _process():
        async with get_db_context() as db:
            now = datetime.utcnow()

            # Get all emails ready to be sent
            stmt = (
                select(EmailLog)
                .where(
                    and_(
                        EmailLog.status == EmailStatus.QUEUED,
                        or_(
                            EmailLog.next_retry_at.is_(None),
                            EmailLog.next_retry_at <= now,
                        ),
                    )
                )
                .limit(100)  # Process in batches
            )
            result = await db.execute(stmt)
            emails = result.scalars().all()

            processed = 0
            failed = 0

            for email in emails:
                service = EmailService(db, email.company_id)
                try:
                    success = await service.process_email(email.id)
                    if success:
                        processed += 1
                    else:
                        failed += 1
                except Exception:
                    failed += 1

            return {
                "processed": processed,
                "failed": failed,
                "total": len(emails),
            }

    return asyncio.get_event_loop().run_until_complete(_process())


@shared_task
def retry_failed_emails(company_id: str = None):
    """
    Retry all failed emails that haven't reached max retries.
    
    Can be called manually or scheduled for periodic cleanup.
    """
    async def _retry():
        async with get_db_context() as db:
            conditions = [
                EmailLog.status == EmailStatus.FAILED,
                EmailLog.retry_count < EmailLog.max_retries,
            ]
            if company_id:
                conditions.append(EmailLog.company_id == company_id)

            stmt = select(EmailLog).where(and_(*conditions)).limit(50)
            result = await db.execute(stmt)
            emails = result.scalars().all()

            retried = 0
            for email in emails:
                email.status = EmailStatus.QUEUED
                email.next_retry_at = None
                retried += 1

            return {"retried": retried}

    return asyncio.get_event_loop().run_until_complete(_retry())
