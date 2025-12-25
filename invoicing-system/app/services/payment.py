"""Payment service with Stripe and Montonio support."""

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentProvider, PaymentStatus


class PaymentService:
    """Service for managing payments and payment links."""

    def __init__(self, db: AsyncSession, company_id: str, user_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id
        self.user_id = user_id

    async def create_payment_link(
        self,
        invoice_id: str,
        provider: PaymentProvider = PaymentProvider.STRIPE,
        expires_in_hours: int = 72,
    ) -> Payment:
        """
        Create a payment link for an invoice.
        
        Returns Payment with payment_url set.
        """
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

        if invoice.status not in {
            InvoiceStatus.SENT,
            InvoiceStatus.VIEWED,
            InvoiceStatus.OVERDUE,
        }:
            raise ValueError("Invoice must be sent before creating payment link")

        # Get company settings
        company = await self._get_company()

        # Create payment record
        payment = Payment(
            id=str(uuid4()),
            company_id=self.company_id,
            invoice_id=invoice_id,
            provider=provider,
            status=PaymentStatus.PENDING,
            amount=invoice.amount_due,
            currency=invoice.currency,
            initiated_at=datetime.utcnow(),
            payment_url_expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
        )

        # Create payment link based on provider
        if provider == PaymentProvider.STRIPE:
            payment_url, checkout_session_id = await self._create_stripe_payment_link(
                invoice, payment, company
            )
            payment.payment_url = payment_url
            payment.checkout_session_id = checkout_session_id

        elif provider == PaymentProvider.MONTONIO:
            payment_url, external_id = await self._create_montonio_payment_link(
                invoice, payment, company
            )
            payment.payment_url = payment_url
            payment.external_id = external_id

        else:
            raise ValueError(f"Unsupported payment provider: {provider}")

        self.db.add(payment)

        # Update invoice with payment link
        invoice.payment_link = payment.payment_url
        invoice.payment_link_expires_at = payment.payment_url_expires_at
        invoice.status = InvoiceStatus.PAYMENT_PENDING

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_UPDATED,
            entity_type="invoice",
            entity_id=invoice_id,
            entity_identifier=invoice.invoice_number,
            metadata={
                "payment_id": payment.id,
                "provider": provider.value,
                "amount": payment.amount,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return payment

    async def record_manual_payment(
        self,
        invoice_id: str,
        amount: int,
        reference: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Payment:
        """Record a manual payment (bank transfer, cash, etc.)."""
        # Get invoice
        stmt = select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.company_id == self.company_id,
            )
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        # Create payment record
        payment = Payment(
            id=str(uuid4()),
            company_id=self.company_id,
            invoice_id=invoice_id,
            provider=PaymentProvider.MANUAL,
            status=PaymentStatus.COMPLETED,
            amount=amount,
            currency=invoice.currency,
            external_reference=reference,
            notes=notes,
            initiated_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )
        self.db.add(payment)

        # Update invoice
        invoice.amount_paid += amount
        if invoice.amount_paid >= invoice.total:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_at = datetime.utcnow()
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.PAYMENT_RECEIVED,
            entity_type="payment",
            entity_id=payment.id,
            metadata={
                "invoice_id": invoice_id,
                "invoice_number": invoice.invoice_number,
                "amount": amount,
                "method": "manual",
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return payment

    async def handle_stripe_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> dict[str, Any]:
        """
        Handle Stripe webhook events.
        
        Validates signature and processes payment events.
        """
        try:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY

            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            raise ValueError(f"Invalid webhook signature: {e}")

        event_type = event["type"]
        event_data = event["data"]["object"]

        # Create audit log for webhook
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            action=AuditAction.WEBHOOK_RECEIVED,
            actor_type="webhook",
            metadata={
                "provider": "stripe",
                "event_type": event_type,
                "event_id": event["id"],
            },
        )
        self.db.add(audit_log)

        # Handle different event types
        if event_type == "checkout.session.completed":
            await self._handle_stripe_checkout_completed(event_data)
        elif event_type == "payment_intent.succeeded":
            await self._handle_stripe_payment_succeeded(event_data)
        elif event_type == "payment_intent.payment_failed":
            await self._handle_stripe_payment_failed(event_data)
        elif event_type == "charge.refunded":
            await self._handle_stripe_refund(event_data)

        await self.db.flush()
        return {"status": "processed", "event_type": event_type}

    async def handle_montonio_webhook(
        self,
        payload: dict,
        signature: str,
    ) -> dict[str, Any]:
        """
        Handle Montonio webhook events.
        
        Validates signature and processes payment events.
        """
        # Verify webhook signature
        if not self._verify_montonio_signature(payload, signature):
            raise ValueError("Invalid webhook signature")

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            action=AuditAction.WEBHOOK_RECEIVED,
            actor_type="webhook",
            metadata={
                "provider": "montonio",
                "status": payload.get("status"),
                "uuid": payload.get("uuid"),
            },
        )
        self.db.add(audit_log)

        status = payload.get("status")
        if status == "finalized":
            await self._handle_montonio_payment_completed(payload)
        elif status == "abandoned":
            await self._handle_montonio_payment_abandoned(payload)

        await self.db.flush()
        return {"status": "processed", "montonio_status": status}

    async def process_refund(
        self,
        payment_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> Payment:
        """Process a refund for a payment."""
        stmt = select(Payment).where(
            and_(
                Payment.id == payment_id,
                Payment.company_id == self.company_id,
            )
        )
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            raise ValueError("Payment not found")

        if not payment.is_refundable:
            raise ValueError("Payment cannot be refunded")

        refund_amount = amount or (payment.amount - payment.refunded_amount)

        if refund_amount > (payment.amount - payment.refunded_amount):
            raise ValueError("Refund amount exceeds available amount")

        # Process refund based on provider
        if payment.provider == PaymentProvider.STRIPE and payment.external_id:
            await self._process_stripe_refund(payment, refund_amount)
        elif payment.provider == PaymentProvider.MONTONIO and payment.external_id:
            await self._process_montonio_refund(payment, refund_amount)

        # Update payment record
        payment.refunded_amount += refund_amount
        if payment.refunded_amount >= payment.amount:
            payment.status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED

        # Update invoice
        invoice_stmt = select(Invoice).where(Invoice.id == payment.invoice_id)
        invoice_result = await self.db.execute(invoice_stmt)
        invoice = invoice_result.scalar_one_or_none()

        if invoice:
            invoice.amount_paid -= refund_amount
            if invoice.amount_paid <= 0:
                invoice.status = InvoiceStatus.SENT
                invoice.paid_at = None
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.PAYMENT_REFUNDED,
            entity_type="payment",
            entity_id=payment.id,
            metadata={
                "amount": refund_amount,
                "reason": reason,
                "invoice_id": payment.invoice_id,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()
        return payment

    async def _get_company(self) -> Company:
        """Get company with settings."""
        stmt = (
            select(Company)
            .options(selectinload(Company.settings))
            .where(Company.id == self.company_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _create_stripe_payment_link(
        self,
        invoice: Invoice,
        payment: Payment,
        company: Company,
    ) -> tuple[str, str]:
        """Create Stripe checkout session."""
        try:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY

            # Create checkout session
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": invoice.currency.lower(),
                            "product_data": {
                                "name": f"Invoice {invoice.invoice_number}",
                                "description": f"Payment for invoice from {company.name}",
                            },
                            "unit_amount": payment.amount,
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=f"{settings.INVOICE_VIEW_BASE_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.INVOICE_VIEW_BASE_URL}/payment-cancelled",
                client_reference_id=invoice.id,
                metadata={
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "payment_id": payment.id,
                    "company_id": self.company_id,
                },
                expires_at=int(payment.payment_url_expires_at.timestamp()),
            )

            return session.url, session.id

        except ImportError:
            # For testing without Stripe
            return f"https://checkout.stripe.com/test/{payment.id}", f"cs_test_{payment.id}"

    async def _create_montonio_payment_link(
        self,
        invoice: Invoice,
        payment: Payment,
        company: Company,
    ) -> tuple[str, str]:
        """Create Montonio payment link."""
        import httpx
        import jwt

        # Build Montonio order data
        order_data = {
            "accessKey": settings.MONTONIO_ACCESS_KEY,
            "merchantReference": invoice.invoice_number,
            "returnUrl": f"{settings.INVOICE_VIEW_BASE_URL}/payment-success",
            "notificationUrl": f"{settings.API_PREFIX}/webhooks/payments/montonio",
            "grandTotal": payment.amount / 100,  # Montonio expects decimal
            "currency": invoice.currency,
            "locale": "en",
            "payment": {
                "method": "paymentInitiation",
                "methodDisplay": "Pay with bank",
                "amount": payment.amount / 100,
                "currency": invoice.currency,
            },
        }

        # Sign with JWT
        token = jwt.encode(
            order_data,
            settings.MONTONIO_SECRET_KEY,
            algorithm="HS256",
        )

        # Create order via API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://stargate.montonio.com/api/orders",
                json={"data": token},
            )
            response.raise_for_status()
            result = response.json()

        return result["paymentUrl"], result["uuid"]

    async def _handle_stripe_checkout_completed(self, session: dict) -> None:
        """Handle Stripe checkout session completed."""
        payment_id = session.get("metadata", {}).get("payment_id")
        if not payment_id:
            return

        stmt = select(Payment).where(Payment.id == payment_id)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            return

        # Update payment
        payment.status = PaymentStatus.COMPLETED
        payment.completed_at = datetime.utcnow()
        payment.external_id = session.get("payment_intent")

        # Update invoice
        await self._update_invoice_payment_status(payment)

    async def _handle_stripe_payment_succeeded(self, payment_intent: dict) -> None:
        """Handle Stripe payment intent succeeded."""
        # Find payment by checkout session or payment intent
        pass  # Usually handled by checkout.session.completed

    async def _handle_stripe_payment_failed(self, payment_intent: dict) -> None:
        """Handle Stripe payment failure."""
        # Find associated payment
        checkout_session_id = payment_intent.get("metadata", {}).get("checkout_session_id")
        if checkout_session_id:
            stmt = select(Payment).where(Payment.checkout_session_id == checkout_session_id)
            result = await self.db.execute(stmt)
            payment = result.scalar_one_or_none()

            if payment:
                payment.status = PaymentStatus.FAILED
                payment.failed_at = datetime.utcnow()
                payment.failure_reason = payment_intent.get("last_payment_error", {}).get("message")
                payment.failure_code = payment_intent.get("last_payment_error", {}).get("code")

    async def _handle_stripe_refund(self, charge: dict) -> None:
        """Handle Stripe refund."""
        # This is handled by process_refund, but can also be triggered externally
        pass

    async def _handle_montonio_payment_completed(self, payload: dict) -> None:
        """Handle Montonio payment completed."""
        external_id = payload.get("uuid")
        if not external_id:
            return

        stmt = select(Payment).where(Payment.external_id == external_id)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            return

        payment.status = PaymentStatus.COMPLETED
        payment.completed_at = datetime.utcnow()
        payment.provider_data = payload

        await self._update_invoice_payment_status(payment)

    async def _handle_montonio_payment_abandoned(self, payload: dict) -> None:
        """Handle Montonio payment abandoned."""
        external_id = payload.get("uuid")
        if not external_id:
            return

        stmt = select(Payment).where(Payment.external_id == external_id)
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if payment:
            payment.status = PaymentStatus.CANCELLED
            payment.provider_data = payload

    async def _update_invoice_payment_status(self, payment: Payment) -> None:
        """Update invoice status after payment."""
        stmt = select(Invoice).where(Invoice.id == payment.invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            return

        invoice.amount_paid += payment.amount
        if invoice.amount_paid >= invoice.total:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_at = datetime.utcnow()
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=invoice.company_id,
            action=AuditAction.INVOICE_PAID,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            metadata={
                "payment_id": payment.id,
                "amount": payment.amount,
                "provider": payment.provider.value,
            },
        )
        self.db.add(audit_log)

    def _verify_montonio_signature(self, payload: dict, signature: str) -> bool:
        """Verify Montonio webhook signature."""
        # Montonio uses a simple JWT verification
        try:
            import jwt

            jwt.decode(
                signature,
                settings.MONTONIO_SECRET_KEY,
                algorithms=["HS256"],
            )
            return True
        except Exception:
            return False

    async def _process_stripe_refund(self, payment: Payment, amount: int) -> None:
        """Process refund via Stripe."""
        try:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY

            stripe.Refund.create(
                payment_intent=payment.external_id,
                amount=amount,
            )
        except ImportError:
            pass  # For testing

    async def _process_montonio_refund(self, payment: Payment, amount: int) -> None:
        """Process refund via Montonio."""
        # Montonio refunds are typically handled manually
        # or through their dashboard
        pass
