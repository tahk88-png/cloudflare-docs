"""Email service with queue and retry logic."""

import asyncio
from datetime import datetime, timedelta
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.company import Company
from app.models.customer import Customer
from app.models.email import EmailLog, EmailStatus, EmailType
from app.models.invoice import Invoice, InvoiceStatus


class EmailService:
    """Service for sending emails with queue and retry support."""

    def __init__(self, db: AsyncSession, company_id: str, user_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id
        self.user_id = user_id

    async def queue_invoice_email(
        self,
        invoice_id: str,
        to_email: Optional[str] = None,
        cc: Optional[list[str]] = None,
        bcc: Optional[list[str]] = None,
        subject: Optional[str] = None,
        message: Optional[str] = None,
        include_payment_link: bool = True,
    ) -> EmailLog:
        """Queue an invoice email for sending."""
        # Get invoice with customer
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.company_id == self.company_id,
                )
            )
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        if invoice.status != InvoiceStatus.DRAFT:
            raise ValueError("Invoice must be in draft status to send")

        # Get customer
        customer = await self._get_customer(invoice.customer_id)
        company = await self._get_company()

        # Determine recipient
        recipient_email = to_email or customer.email
        recipient_name = customer.contact_person or customer.name

        # Build subject
        if not subject:
            subject = self._build_invoice_subject(invoice, company)

        # Build email body
        body_html, body_text = await self._build_invoice_email_body(
            invoice, company, customer, message, include_payment_link
        )

        # Create email log entry
        email_log = EmailLog(
            id=str(uuid4()),
            company_id=self.company_id,
            invoice_id=invoice_id,
            email_type=EmailType.INVOICE,
            status=EmailStatus.QUEUED,
            from_email=settings.EMAIL_FROM_ADDRESS,
            from_name=company.settings.email_from_name if company.settings else settings.EMAIL_FROM_NAME,
            reply_to=company.settings.email_reply_to if company.settings else settings.EMAIL_REPLY_TO,
            to_email=recipient_email,
            to_name=recipient_name,
            cc=",".join(cc) if cc else None,
            bcc=",".join(bcc) if bcc else None,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            attachments=[{
                "filename": f"{invoice.invoice_number}.pdf",
                "content_type": "application/pdf",
            }] if invoice.pdf_url else None,
            max_retries=settings.EMAIL_MAX_RETRIES,
            queued_at=datetime.utcnow(),
        )
        self.db.add(email_log)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.EMAIL_QUEUED,
            entity_type="email",
            entity_id=email_log.id,
            metadata={
                "invoice_id": invoice_id,
                "invoice_number": invoice.invoice_number,
                "to_email": recipient_email,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return email_log

    async def queue_reminder_email(
        self,
        invoice_id: str,
        reminder_number: int,
        custom_message: Optional[str] = None,
    ) -> EmailLog:
        """Queue a payment reminder email."""
        # Get invoice
        stmt = (
            select(Invoice)
            .where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.company_id == self.company_id,
                )
            )
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        # Get customer and company
        customer = await self._get_customer(invoice.customer_id)
        company = await self._get_company()

        # Build reminder subject and body
        subject = self._build_reminder_subject(invoice, company, reminder_number)
        body_html, body_text = await self._build_reminder_email_body(
            invoice, company, customer, reminder_number, custom_message
        )

        # Create email log
        email_log = EmailLog(
            id=str(uuid4()),
            company_id=self.company_id,
            invoice_id=invoice_id,
            email_type=EmailType.REMINDER,
            status=EmailStatus.QUEUED,
            from_email=settings.EMAIL_FROM_ADDRESS,
            from_name=company.settings.email_from_name if company.settings else settings.EMAIL_FROM_NAME,
            reply_to=company.settings.email_reply_to if company.settings else settings.EMAIL_REPLY_TO,
            to_email=customer.email,
            to_name=customer.contact_person or customer.name,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            max_retries=settings.EMAIL_MAX_RETRIES,
            queued_at=datetime.utcnow(),
            reminder_number=reminder_number,
        )
        self.db.add(email_log)

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_REMINDER_SENT,
            entity_type="invoice",
            entity_id=invoice_id,
            entity_identifier=invoice.invoice_number,
            metadata={
                "reminder_number": reminder_number,
                "to_email": customer.email,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return email_log

    async def process_email(self, email_id: str) -> bool:
        """
        Process a queued email - attempt to send it.
        Returns True if sent successfully, False otherwise.
        """
        stmt = select(EmailLog).where(EmailLog.id == email_id)
        result = await self.db.execute(stmt)
        email_log = result.scalar_one_or_none()

        if not email_log:
            raise ValueError("Email not found")

        if email_log.status not in {EmailStatus.QUEUED, EmailStatus.SENDING}:
            raise ValueError(f"Email is not in sendable state: {email_log.status}")

        # Update status to sending
        email_log.status = EmailStatus.SENDING

        try:
            # Actually send the email
            message_id = await self._send_email(email_log)

            # Update success
            email_log.status = EmailStatus.SENT
            email_log.sent_at = datetime.utcnow()
            email_log.message_id = message_id

            # Update invoice status if this was the initial send
            if email_log.email_type == EmailType.INVOICE and email_log.invoice_id:
                await self._mark_invoice_sent(email_log.invoice_id)

            # Create audit log
            audit_log = AuditLog(
                id=str(uuid4()),
                company_id=self.company_id,
                action=AuditAction.EMAIL_SENT,
                entity_type="email",
                entity_id=email_log.id,
                metadata={
                    "message_id": message_id,
                    "to_email": email_log.to_email,
                },
            )
            self.db.add(audit_log)

            await self.db.flush()
            return True

        except Exception as e:
            # Handle failure
            email_log.retry_count += 1
            email_log.last_error = str(e)

            if email_log.retry_count >= email_log.max_retries:
                # Max retries reached - mark as failed
                email_log.status = EmailStatus.FAILED
                email_log.failed_at = datetime.utcnow()

                audit_log = AuditLog(
                    id=str(uuid4()),
                    company_id=self.company_id,
                    action=AuditAction.EMAIL_FAILED,
                    entity_type="email",
                    entity_id=email_log.id,
                    metadata={
                        "error": str(e),
                        "retry_count": email_log.retry_count,
                    },
                )
                self.db.add(audit_log)
            else:
                # Schedule retry with exponential backoff
                email_log.status = EmailStatus.QUEUED
                delay = settings.EMAIL_RETRY_DELAY_SECONDS * (
                    settings.EMAIL_RETRY_BACKOFF_MULTIPLIER ** (email_log.retry_count - 1)
                )
                email_log.next_retry_at = datetime.utcnow() + timedelta(seconds=delay)

            await self.db.flush()
            return False

    async def handle_bounce(self, email_id: str, bounce_data: dict) -> None:
        """Handle email bounce notification."""
        stmt = select(EmailLog).where(EmailLog.id == email_id)
        result = await self.db.execute(stmt)
        email_log = result.scalar_one_or_none()

        if not email_log:
            return

        email_log.status = EmailStatus.BOUNCED
        email_log.bounced_at = datetime.utcnow()
        email_log.error_details = bounce_data

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=email_log.company_id,
            action=AuditAction.EMAIL_BOUNCED,
            entity_type="email",
            entity_id=email_log.id,
            metadata=bounce_data,
        )
        self.db.add(audit_log)

        await self.db.flush()

    async def retry_email(self, email_id: str, force: bool = False) -> EmailLog:
        """Manually retry a failed email."""
        stmt = select(EmailLog).where(EmailLog.id == email_id)
        result = await self.db.execute(stmt)
        email_log = result.scalar_one_or_none()

        if not email_log:
            raise ValueError("Email not found")

        if not force and not email_log.can_retry:
            raise ValueError("Email cannot be retried")

        # Reset for retry
        email_log.status = EmailStatus.QUEUED
        email_log.next_retry_at = None
        if force:
            email_log.retry_count = 0

        await self.db.flush()
        return email_log

    async def _get_customer(self, customer_id: str) -> Customer:
        """Get customer by ID."""
        stmt = select(Customer).where(Customer.id == customer_id)
        result = await self.db.execute(stmt)
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")
        return customer

    async def _get_company(self) -> Company:
        """Get company with settings."""
        stmt = (
            select(Company)
            .options(selectinload(Company.settings))
            .where(Company.id == self.company_id)
        )
        result = await self.db.execute(stmt)
        company = result.scalar_one_or_none()
        if not company:
            raise ValueError("Company not found")
        return company

    def _build_invoice_subject(self, invoice: Invoice, company: Company) -> str:
        """Build invoice email subject."""
        return f"Invoice {invoice.invoice_number} from {company.name}"

    async def _build_invoice_email_body(
        self,
        invoice: Invoice,
        company: Company,
        customer: Customer,
        custom_message: Optional[str],
        include_payment_link: bool,
    ) -> tuple[str, str]:
        """Build invoice email body (HTML and plain text)."""
        # Format currency
        total_formatted = f"€{invoice.total / 100:,.2f}"

        # HTML body
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Dear {customer.contact_person or customer.name},</p>
            
            {"<p>" + custom_message + "</p>" if custom_message else ""}
            
            <p>Please find attached invoice <strong>{invoice.invoice_number}</strong> 
            for the amount of <strong>{total_formatted}</strong>.</p>
            
            <table style="margin: 20px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Invoice Number:</td>
                    <td style="padding: 5px 0;"><strong>{invoice.invoice_number}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Issue Date:</td>
                    <td style="padding: 5px 0;">{invoice.issue_date.strftime('%Y-%m-%d')}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Due Date:</td>
                    <td style="padding: 5px 0;">{invoice.due_date.strftime('%Y-%m-%d')}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Total Amount:</td>
                    <td style="padding: 5px 0;"><strong>{total_formatted}</strong></td>
                </tr>
            </table>
            
            {self._get_payment_link_html(invoice) if include_payment_link and invoice.payment_link else ""}
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            {company.name}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
                {company.name}<br>
                {company.address_line1 or ""}<br>
                {company.postal_code or ""} {company.city or ""}, {company.country}<br>
                {company.email}
            </p>
        </body>
        </html>
        """

        # Plain text body
        text = f"""
Dear {customer.contact_person or customer.name},

{custom_message + chr(10) + chr(10) if custom_message else ""}Please find attached invoice {invoice.invoice_number} for the amount of {total_formatted}.

Invoice Number: {invoice.invoice_number}
Issue Date: {invoice.issue_date.strftime('%Y-%m-%d')}
Due Date: {invoice.due_date.strftime('%Y-%m-%d')}
Total Amount: {total_formatted}

{self._get_payment_link_text(invoice) if include_payment_link and invoice.payment_link else ""}

If you have any questions, please don't hesitate to contact us.

Best regards,
{company.name}

---
{company.name}
{company.address_line1 or ""}
{company.postal_code or ""} {company.city or ""}, {company.country}
{company.email}
        """

        return html.strip(), text.strip()

    def _build_reminder_subject(
        self, invoice: Invoice, company: Company, reminder_number: int
    ) -> str:
        """Build reminder email subject."""
        if reminder_number == 1:
            prefix = "Friendly Reminder"
        elif reminder_number == 2:
            prefix = "Second Reminder"
        else:
            prefix = f"Payment Reminder #{reminder_number}"
        return f"{prefix}: Invoice {invoice.invoice_number} from {company.name}"

    async def _build_reminder_email_body(
        self,
        invoice: Invoice,
        company: Company,
        customer: Customer,
        reminder_number: int,
        custom_message: Optional[str],
    ) -> tuple[str, str]:
        """Build reminder email body."""
        total_formatted = f"€{invoice.total / 100:,.2f}"
        days_overdue = (datetime.utcnow().date() - invoice.due_date).days

        urgency = ""
        if reminder_number >= 3:
            urgency = "This is an urgent reminder. "

        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Dear {customer.contact_person or customer.name},</p>
            
            {"<p>" + custom_message + "</p>" if custom_message else ""}
            
            <p>{urgency}This is a reminder that invoice <strong>{invoice.invoice_number}</strong> 
            for <strong>{total_formatted}</strong> was due on {invoice.due_date.strftime('%Y-%m-%d')}
            {f" ({days_overdue} days overdue)" if days_overdue > 0 else ""}.</p>
            
            <table style="margin: 20px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Invoice Number:</td>
                    <td style="padding: 5px 0;"><strong>{invoice.invoice_number}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Due Date:</td>
                    <td style="padding: 5px 0;">{invoice.due_date.strftime('%Y-%m-%d')}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 15px 5px 0; color: #666;">Amount Due:</td>
                    <td style="padding: 5px 0;"><strong>{total_formatted}</strong></td>
                </tr>
            </table>
            
            {self._get_payment_link_html(invoice) if invoice.payment_link else ""}
            
            <p>If you have already made this payment, please disregard this reminder.</p>
            
            <p>Best regards,<br>
            {company.name}</p>
        </body>
        </html>
        """

        text = f"""
Dear {customer.contact_person or customer.name},

{custom_message + chr(10) + chr(10) if custom_message else ""}{urgency}This is a reminder that invoice {invoice.invoice_number} for {total_formatted} was due on {invoice.due_date.strftime('%Y-%m-%d')}{f" ({days_overdue} days overdue)" if days_overdue > 0 else ""}.

Invoice Number: {invoice.invoice_number}
Due Date: {invoice.due_date.strftime('%Y-%m-%d')}
Amount Due: {total_formatted}

{self._get_payment_link_text(invoice) if invoice.payment_link else ""}

If you have already made this payment, please disregard this reminder.

Best regards,
{company.name}
        """

        return html.strip(), text.strip()

    def _get_payment_link_html(self, invoice: Invoice) -> str:
        """Get payment link HTML."""
        if not invoice.payment_link:
            return ""
        return f"""
        <p style="margin: 20px 0;">
            <a href="{invoice.payment_link}" 
               style="display: inline-block; padding: 12px 24px; 
                      background-color: #2563eb; color: white; 
                      text-decoration: none; border-radius: 5px;">
                Pay Now
            </a>
        </p>
        """

    def _get_payment_link_text(self, invoice: Invoice) -> str:
        """Get payment link text."""
        if not invoice.payment_link:
            return ""
        return f"Pay online: {invoice.payment_link}"

    async def _send_email(self, email_log: EmailLog) -> str:
        """Actually send the email via SMTP."""
        try:
            import aiosmtplib

            # Build message
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{email_log.from_name} <{email_log.from_email}>"
            msg["To"] = email_log.to_email
            msg["Subject"] = email_log.subject
            if email_log.reply_to:
                msg["Reply-To"] = email_log.reply_to
            if email_log.cc:
                msg["Cc"] = email_log.cc

            # Add body
            if email_log.body_text:
                msg.attach(MIMEText(email_log.body_text, "plain"))
            if email_log.body_html:
                msg.attach(MIMEText(email_log.body_html, "html"))

            # Send via SMTP
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER or None,
                password=settings.SMTP_PASSWORD or None,
                use_tls=settings.SMTP_USE_TLS,
            )

            return msg["Message-ID"] or str(uuid4())

        except ImportError:
            # For testing without SMTP
            return f"test-{uuid4()}"

    async def _mark_invoice_sent(self, invoice_id: str) -> None:
        """Mark invoice as sent after successful email delivery."""
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if invoice and invoice.status == InvoiceStatus.DRAFT:
            invoice.status = InvoiceStatus.SENT
            invoice.sent_at = datetime.utcnow()
            invoice.is_pdf_final = True  # Lock the PDF
