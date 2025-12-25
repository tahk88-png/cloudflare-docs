"""Invoice processing tasks."""

import asyncio
from datetime import date

from celery import shared_task
from sqlalchemy import and_, select

from app.core.database import get_db_context
from app.models.invoice import Invoice, InvoiceStatus


@shared_task
def check_overdue_invoices():
    """
    Check for invoices that have become overdue.
    
    Updates status from SENT/VIEWED to OVERDUE if past due date.
    Runs daily (configured in Celery Beat).
    """
    async def _check():
        async with get_db_context() as db:
            today = date.today()

            # Find invoices that should be marked overdue
            stmt = select(Invoice).where(
                and_(
                    Invoice.status.in_([
                        InvoiceStatus.SENT,
                        InvoiceStatus.VIEWED,
                        InvoiceStatus.PAYMENT_PENDING,
                    ]),
                    Invoice.due_date < today,
                    Invoice.deleted_at.is_(None),
                )
            )
            result = await db.execute(stmt)
            invoices = result.scalars().all()

            updated = 0
            for invoice in invoices:
                invoice.status = InvoiceStatus.OVERDUE
                updated += 1

            return {"updated_to_overdue": updated}

    return asyncio.get_event_loop().run_until_complete(_check())


@shared_task
def generate_pdf_async(invoice_id: str, company_id: str, template_id: str = None):
    """
    Generate PDF for an invoice in the background.
    
    Useful for batch PDF generation or when immediate response isn't needed.
    """
    async def _generate():
        async with get_db_context() as db:
            from app.services.pdf import PDFService

            service = PDFService(db, company_id)
            try:
                result = await service.generate_pdf(invoice_id, template_id)
                return {
                    "success": True,
                    "pdf_url": result["pdf_url"],
                    "pdf_sha256": result["pdf_sha256"],
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                }

    return asyncio.get_event_loop().run_until_complete(_generate())


@shared_task
def batch_generate_pdfs(invoice_ids: list[str], company_id: str):
    """
    Generate PDFs for multiple invoices.
    
    Useful for regenerating all PDFs or generating PDFs in bulk.
    """
    async def _batch():
        async with get_db_context() as db:
            from app.services.pdf import PDFService

            service = PDFService(db, company_id)
            results = []

            for invoice_id in invoice_ids:
                try:
                    result = await service.generate_pdf(invoice_id)
                    results.append({
                        "invoice_id": invoice_id,
                        "success": True,
                        "pdf_url": result["pdf_url"],
                    })
                except Exception as e:
                    results.append({
                        "invoice_id": invoice_id,
                        "success": False,
                        "error": str(e),
                    })

            return {
                "total": len(invoice_ids),
                "successful": sum(1 for r in results if r["success"]),
                "failed": sum(1 for r in results if not r["success"]),
                "results": results,
            }

    return asyncio.get_event_loop().run_until_complete(_batch())
