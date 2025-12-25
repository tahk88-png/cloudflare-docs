"""Payment API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Context, can_view_invoices, require_permission
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.schemas.payment import (
    CreatePaymentLinkRequest,
    CreatePaymentLinkResponse,
    PaymentCreate,
    PaymentListResponse,
    PaymentResponse,
    RefundRequest,
)
from app.services.payment import PaymentService


router = APIRouter()


@router.post(
    "/",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("payments.manage"))],
)
async def record_manual_payment(
    data: PaymentCreate,
    ctx: Context,
):
    """
    Record a manual payment (bank transfer, cash, etc.).
    
    This is used when payments are received outside of the online payment flow.
    """
    service = PaymentService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        payment = await service.record_manual_payment(
            invoice_id=data.invoice_id,
            amount=data.amount,
            reference=data.external_reference,
            notes=data.notes,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/",
    response_model=PaymentListResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def list_payments(
    ctx: Context,
    invoice_id: Optional[str] = Query(None, description="Filter by invoice"),
    status: Optional[PaymentStatus] = Query(None, description="Filter by status"),
    provider: Optional[PaymentProvider] = Query(None, description="Filter by provider"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List payments with filtering and pagination.
    """
    conditions = [Payment.company_id == ctx.company_id]

    if invoice_id:
        conditions.append(Payment.invoice_id == invoice_id)
    if status:
        conditions.append(Payment.status == status)
    if provider:
        conditions.append(Payment.provider == provider)

    # Count total
    count_stmt = (
        select(func.count()).select_from(Payment).where(and_(*conditions))
    )
    count_result = await ctx.db.execute(count_stmt)
    total = count_result.scalar()

    # Get paginated results
    stmt = (
        select(Payment)
        .where(and_(*conditions))
        .order_by(Payment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await ctx.db.execute(stmt)
    payments = list(result.scalars().all())

    total_pages = (total + page_size - 1) // page_size

    return PaymentListResponse(
        items=payments,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def get_payment(
    payment_id: str,
    ctx: Context,
):
    """
    Get a specific payment by ID.
    """
    stmt = select(Payment).where(
        Payment.id == payment_id,
        Payment.company_id == ctx.company_id,
    )
    result = await ctx.db.execute(stmt)
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


@router.post(
    "/create-link",
    response_model=CreatePaymentLinkResponse,
    dependencies=[Depends(require_permission("payments.manage"))],
)
async def create_payment_link(
    data: CreatePaymentLinkRequest,
    invoice_id: str = Query(..., description="Invoice ID to create payment link for"),
    ctx: Context = None,
):
    """
    Create a payment link for an invoice.
    
    Supports:
    - Stripe: Credit/debit card payments
    - Montonio: Baltic bank link payments
    
    The link is valid for the specified duration and can only be used once.
    """
    service = PaymentService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        payment = await service.create_payment_link(
            invoice_id=invoice_id,
            provider=data.provider,
            expires_in_hours=data.expires_in_hours,
        )

        return CreatePaymentLinkResponse(
            payment_id=payment.id,
            payment_url=payment.payment_url,
            expires_at=payment.payment_url_expires_at,
            provider=payment.provider,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
    dependencies=[Depends(require_permission("payments.manage"))],
)
async def refund_payment(
    payment_id: str,
    data: RefundRequest,
    ctx: Context,
):
    """
    Process a refund for a payment.
    
    Can be a full or partial refund depending on the amount specified.
    """
    service = PaymentService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        payment = await service.process_refund(
            payment_id=payment_id,
            amount=data.amount,
            reason=data.reason,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
