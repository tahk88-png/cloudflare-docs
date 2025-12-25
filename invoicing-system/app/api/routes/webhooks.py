"""Webhook API routes for payment providers."""

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payment import PaymentService


router = APIRouter()


@router.post("/payments/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    
    Processes payment-related events:
    - checkout.session.completed: Payment successful
    - payment_intent.succeeded: Payment captured
    - payment_intent.payment_failed: Payment failed
    - charge.refunded: Refund processed
    
    Validates webhook signature using Stripe's webhook secret.
    """
    # Get raw body for signature verification
    payload = await request.body()

    # Get company_id from webhook metadata (set during checkout session creation)
    # For now, we'll need to extract it from the event
    try:
        import json
        event_data = json.loads(payload)
        company_id = event_data.get("data", {}).get("object", {}).get("metadata", {}).get("company_id")
        
        if not company_id:
            # Try to find from existing payment
            return {"status": "skipped", "reason": "no company_id in metadata"}

        service = PaymentService(db, company_id)
        result = await service.handle_stripe_webhook(payload, stripe_signature)
        
        await db.commit()
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}",
        )


@router.post("/payments/montonio")
async def handle_montonio_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Montonio webhook events.
    
    Processes payment status updates:
    - finalized: Payment successful
    - abandoned: Payment abandoned/cancelled
    
    Validates JWT signature from Montonio.
    """
    try:
        # Get JSON payload
        payload = await request.json()
        
        # Get authorization header for signature
        auth_header = request.headers.get("Authorization", "")
        signature = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
        
        # Extract company_id from merchant_reference (should contain it)
        merchant_reference = payload.get("merchant_reference", "")
        
        # For Montonio, we typically store company info in the merchant reference
        # Format could be: COMPANY_ID|INVOICE_NUMBER
        # For now, we'll need to look up the payment by UUID
        
        external_id = payload.get("uuid")
        if not external_id:
            return {"status": "skipped", "reason": "no uuid in payload"}
        
        # Find the payment to get company_id
        from sqlalchemy import select
        from app.models.payment import Payment
        
        stmt = select(Payment).where(Payment.external_id == external_id)
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            return {"status": "skipped", "reason": "payment not found"}
        
        service = PaymentService(db, payment.company_id)
        result = await service.handle_montonio_webhook(payload, signature)
        
        await db.commit()
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}",
        )


@router.post("/email/bounce")
async def handle_email_bounce(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle email bounce notifications.
    
    This endpoint can be configured with email providers like:
    - AWS SES
    - SendGrid
    - Mailgun
    
    Updates email status to 'bounced' and logs the bounce details.
    """
    try:
        payload = await request.json()
        
        # The structure depends on the email provider
        # This is a generic handler that can be adapted
        
        # For AWS SES SNS notifications:
        if "Type" in payload and payload.get("Type") == "Notification":
            import json
            message = json.loads(payload.get("Message", "{}"))
            if message.get("notificationType") == "Bounce":
                bounce = message.get("bounce", {})
                recipients = bounce.get("bouncedRecipients", [])
                
                from app.services.email import EmailService
                from sqlalchemy import select
                from app.models.email import EmailLog
                
                for recipient in recipients:
                    email_address = recipient.get("emailAddress")
                    
                    # Find email log by recipient
                    stmt = select(EmailLog).where(
                        EmailLog.to_email == email_address,
                        EmailLog.status == "sent",
                    ).order_by(EmailLog.sent_at.desc()).limit(1)
                    
                    result = await db.execute(stmt)
                    email_log = result.scalar_one_or_none()
                    
                    if email_log:
                        service = EmailService(db, email_log.company_id)
                        await service.handle_bounce(
                            email_log.id,
                            {
                                "bounce_type": bounce.get("bounceType"),
                                "bounce_subtype": bounce.get("bounceSubType"),
                                "diagnostic_code": recipient.get("diagnosticCode"),
                            },
                        )
        
        await db.commit()
        return {"status": "processed"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}",
        )
