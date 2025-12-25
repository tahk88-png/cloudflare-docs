"""Invoice API routes."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import (
    Context,
    can_create_invoices,
    can_edit_invoices,
    can_send_invoices,
    can_view_invoices,
)
from app.models.invoice import InvoiceStatus
from app.schemas.invoice import (
    GeneratePDFRequest,
    GeneratePDFResponse,
    InvoiceCreate,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceUpdate,
    SendEmailRequest,
    SendEmailResponse,
)
from app.services.email import EmailService
from app.services.invoice import InvoiceService
from app.services.pdf import PDFService
from app.services.token import TokenService


router = APIRouter()


@router.post(
    "/",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(can_create_invoices())],
)
async def create_invoice(
    data: InvoiceCreate,
    ctx: Context,
):
    """
    Create a new invoice.
    
    Creates an invoice in DRAFT status with a unique invoice number (YYYY-000001 format).
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)
    try:
        invoice = await service.create(data)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/",
    response_model=InvoiceListResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def list_invoices(
    ctx: Context,
    status: Optional[InvoiceStatus] = Query(None, description="Filter by status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer"),
    from_date: Optional[date] = Query(None, description="Filter by issue date (from)"),
    to_date: Optional[date] = Query(None, description="Filter by issue date (to)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List invoices with filtering and pagination.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)
    invoices, total = await service.list(
        status=status,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return InvoiceListResponse(
        items=invoices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def get_invoice(
    invoice_id: str,
    ctx: Context,
):
    """
    Get a specific invoice by ID.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)
    invoice = await service.get_by_id(invoice_id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return invoice


@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    dependencies=[Depends(can_edit_invoices())],
)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    ctx: Context,
):
    """
    Update an invoice (draft only).
    
    Only draft invoices can be edited. Once sent, invoices become immutable.
    To make changes to a sent invoice, create a credit note instead.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        invoice = await service.update(invoice_id, data)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(can_edit_invoices())],
)
async def delete_invoice(
    invoice_id: str,
    ctx: Context,
):
    """
    Delete an invoice (draft only).
    
    Only draft invoices can be deleted. Sent invoices must be voided instead.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        await service.soft_delete(invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{invoice_id}/generate-pdf",
    response_model=GeneratePDFResponse,
    dependencies=[Depends(can_view_invoices())],
)
async def generate_pdf(
    invoice_id: str,
    data: GeneratePDFRequest,
    ctx: Context,
):
    """
    Generate PDF for an invoice.
    
    - Draft invoices get a DRAFT watermark
    - Sent invoices get a final PDF without watermark
    - Once an invoice is sent, its PDF becomes immutable (stored with SHA256 hash)
    """
    service = PDFService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        result = await service.generate_pdf(
            invoice_id=invoice_id,
            template_id=data.template_id,
            force_regenerate=data.force_regenerate,
        )
        return GeneratePDFResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post(
    "/{invoice_id}/send-email",
    response_model=SendEmailResponse,
    dependencies=[Depends(can_send_invoices())],
)
async def send_invoice_email(
    invoice_id: str,
    data: SendEmailRequest,
    ctx: Context,
):
    """
    Send invoice via email.
    
    - Generates a final PDF (without DRAFT watermark)
    - Creates a secure view token for the customer
    - Queues the email for delivery with retry support
    - Transitions invoice from DRAFT to SENT status
    
    Email uses:
    - From: no-reply@domain
    - Reply-To: support@domain (or company configured)
    """
    # First generate PDF if needed
    pdf_service = PDFService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        if data.generate_fresh_pdf:
            await pdf_service.generate_pdf(invoice_id, force_regenerate=True)
        else:
            # Ensure PDF exists
            await pdf_service.generate_pdf(invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Create view token
    token_service = TokenService(ctx.db, ctx.company_id)
    view_token = await token_service.create_view_token(invoice_id)

    # Queue email
    email_service = EmailService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        email_log = await email_service.queue_invoice_email(
            invoice_id=invoice_id,
            to_email=data.to_email,
            cc=data.cc,
            bcc=data.bcc,
            subject=data.subject,
            message=data.message,
            include_payment_link=data.include_payment_link,
        )

        return SendEmailResponse(
            email_id=email_log.id,
            status=email_log.status.value,
            sent_to=email_log.to_email,
            queued_at=email_log.queued_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{invoice_id}/credit-note",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(can_create_invoices())],
)
async def create_credit_note(
    invoice_id: str,
    ctx: Context,
    reason: Optional[str] = Query(None, description="Reason for credit note"),
):
    """
    Create a credit note for an invoice.
    
    Credit notes are used instead of editing sent invoices.
    They create a new invoice with negative amounts that references the original.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        credit_note = await service.create_credit_note(invoice_id, reason)
        return credit_note
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{invoice_id}/void",
    response_model=InvoiceResponse,
    dependencies=[Depends(can_edit_invoices())],
)
async def void_invoice(
    invoice_id: str,
    ctx: Context,
):
    """
    Void an invoice.
    
    Voided invoices are kept for accounting records but marked as void.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        invoice = await service.transition_status(
            invoice_id,
            InvoiceStatus.VOID,
            metadata={"voided_by": ctx.user_id},
        )
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{invoice_id}/cancel",
    response_model=InvoiceResponse,
    dependencies=[Depends(can_edit_invoices())],
)
async def cancel_invoice(
    invoice_id: str,
    ctx: Context,
):
    """
    Cancel a draft invoice.
    """
    service = InvoiceService(ctx.db, ctx.company_id, ctx.user_id)

    try:
        invoice = await service.transition_status(
            invoice_id,
            InvoiceStatus.CANCELLED,
            metadata={"cancelled_by": ctx.user_id},
        )
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
