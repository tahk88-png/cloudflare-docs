"""PDF generation service with draft/final modes."""

import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from jinja2 import Environment, BaseLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditAction, AuditLog
from app.models.company import Company, CompanySettings
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.models.template import (
    DEFAULT_INVOICE_CSS,
    DEFAULT_INVOICE_TEMPLATE,
    InvoiceTemplate,
)


class PDFService:
    """Service for generating invoice PDFs."""

    def __init__(self, db: AsyncSession, company_id: str, user_id: Optional[str] = None):
        self.db = db
        self.company_id = company_id
        self.user_id = user_id
        self.jinja_env = Environment(loader=BaseLoader())

    async def generate_pdf(
        self,
        invoice_id: str,
        template_id: Optional[str] = None,
        force_regenerate: bool = False,
    ) -> dict:
        """
        Generate PDF for an invoice.
        
        - Draft invoices get a DRAFT watermark
        - Sent/Final invoices are immutable (no watermark, stored permanently)
        
        Returns dict with pdf_url, pdf_sha256, is_draft, generated_at
        """
        # Get invoice with items
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(Invoice.id == invoice_id)
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Invoice not found")

        # Check if we already have a final PDF
        if invoice.is_pdf_final and not force_regenerate:
            return {
                "pdf_url": invoice.pdf_url,
                "pdf_sha256": invoice.pdf_sha256,
                "is_draft": False,
                "generated_at": invoice.pdf_generated_at,
            }

        # Get company info
        company = await self._get_company()
        customer = await self._get_customer(invoice.customer_id)

        # Get template
        template = await self._get_template(template_id)

        # Determine if this is a draft
        is_draft = invoice.status == InvoiceStatus.DRAFT

        # Render HTML
        html_content = await self._render_template(
            template, invoice, company, customer, is_draft
        )

        # Generate PDF
        pdf_bytes = await self._generate_pdf_bytes(html_content)

        # Calculate hash
        pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # Store PDF
        pdf_url = await self._store_pdf(invoice, pdf_bytes, is_draft)

        # Update invoice record
        invoice.pdf_url = pdf_url
        invoice.pdf_sha256 = pdf_sha256
        invoice.pdf_generated_at = datetime.utcnow()

        # Mark as final only for non-draft invoices
        if not is_draft:
            invoice.is_pdf_final = True

        # Create audit log
        audit_log = AuditLog(
            id=str(uuid4()),
            company_id=self.company_id,
            user_id=self.user_id,
            action=AuditAction.INVOICE_PDF_GENERATED,
            entity_type="invoice",
            entity_id=invoice.id,
            entity_identifier=invoice.invoice_number,
            metadata={
                "is_draft": is_draft,
                "pdf_sha256": pdf_sha256,
                "template_id": template_id,
            },
        )
        self.db.add(audit_log)

        await self.db.flush()

        return {
            "pdf_url": pdf_url,
            "pdf_sha256": pdf_sha256,
            "is_draft": is_draft,
            "generated_at": invoice.pdf_generated_at,
        }

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

    async def _get_customer(self, customer_id: str) -> Customer:
        """Get customer by ID."""
        stmt = select(Customer).where(Customer.id == customer_id)
        result = await self.db.execute(stmt)
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")
        return customer

    async def _get_template(self, template_id: Optional[str] = None) -> dict:
        """Get invoice template."""
        if template_id:
            stmt = select(InvoiceTemplate).where(
                InvoiceTemplate.id == template_id,
                InvoiceTemplate.company_id == self.company_id,
                InvoiceTemplate.is_active == True,
            )
            result = await self.db.execute(stmt)
            template = result.scalar_one_or_none()
            if template:
                return {
                    "html": template.html_template,
                    "css": template.css_styles or DEFAULT_INVOICE_CSS,
                    "settings": template.settings or {},
                    "page_size": template.page_size,
                    "page_orientation": template.page_orientation,
                    "margin_top": template.margin_top,
                    "margin_right": template.margin_right,
                    "margin_bottom": template.margin_bottom,
                    "margin_left": template.margin_left,
                    "primary_color": template.primary_color,
                    "font_family": template.font_family,
                }

        # Return default template
        return {
            "html": DEFAULT_INVOICE_TEMPLATE,
            "css": DEFAULT_INVOICE_CSS,
            "settings": {},
            "page_size": "A4",
            "page_orientation": "portrait",
            "margin_top": "20mm",
            "margin_right": "15mm",
            "margin_bottom": "20mm",
            "margin_left": "15mm",
            "primary_color": "#2563eb",
            "font_family": "Arial, sans-serif",
        }

    async def _render_template(
        self,
        template: dict,
        invoice: Invoice,
        company: Company,
        customer: Customer,
        is_draft: bool,
    ) -> str:
        """Render invoice template to HTML."""
        # Prepare context
        context = {
            "invoice": invoice,
            "company": company,
            "customer": customer,
            "items": invoice.items,
            "is_draft": is_draft,
            "vat_breakdown": invoice.vat_breakdown or {},
            "payment_info": self._get_payment_info(company),
            "format_currency": self._format_currency,
            "primary_color": template.get("primary_color", "#2563eb"),
            "font_family": template.get("font_family", "Arial, sans-serif"),
            "page_size": template.get("page_size", "A4"),
            "page_orientation": template.get("page_orientation", "portrait"),
            "margin_top": template.get("margin_top", "20mm"),
            "margin_right": template.get("margin_right", "15mm"),
            "margin_bottom": template.get("margin_bottom", "20mm"),
            "margin_left": template.get("margin_left", "15mm"),
        }

        # Render CSS
        css_template = self.jinja_env.from_string(template["css"])
        rendered_css = css_template.render(**context)

        # Render HTML
        html_template = self.jinja_env.from_string(template["html"])
        rendered_html = html_template.render(**context)

        # Combine into full HTML document
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>{rendered_css}</style>
        </head>
        <body>
            {rendered_html}
        </body>
        </html>
        """

        return full_html

    def _get_payment_info(self, company: Company) -> Optional[dict]:
        """Extract payment info from company settings."""
        if not company.settings:
            return None

        settings = company.settings
        if not any([settings.bank_name, settings.bank_iban, settings.bank_swift]):
            return None

        return {
            "bank_name": settings.bank_name,
            "bank_account_number": settings.bank_account_number,
            "bank_iban": settings.bank_iban,
            "bank_swift": settings.bank_swift,
        }

    def _format_currency(self, amount, currency: str = "EUR") -> str:
        """Format amount as currency string."""
        # Currency symbols
        symbols = {
            "EUR": "€",
            "USD": "$",
            "GBP": "£",
            "SEK": "kr",
            "NOK": "kr",
            "DKK": "kr",
        }
        symbol = symbols.get(currency, currency)

        # Format with 2 decimal places and thousand separators
        if currency in ["EUR", "GBP"]:
            return f"{symbol}{amount:,.2f}"
        else:
            return f"{amount:,.2f} {symbol}"

    async def _generate_pdf_bytes(self, html_content: str) -> bytes:
        """Generate PDF from HTML content using WeasyPrint."""
        try:
            from weasyprint import HTML, CSS

            # Generate PDF
            html = HTML(string=html_content)
            pdf_bytes = html.write_pdf()
            return pdf_bytes
        except ImportError:
            # Fallback for when WeasyPrint is not available
            # In production, this should never happen
            raise RuntimeError(
                "WeasyPrint is not installed. Please install it for PDF generation."
            )

    async def _store_pdf(
        self, invoice: Invoice, pdf_bytes: bytes, is_draft: bool
    ) -> str:
        """Store PDF file and return URL."""
        # Create storage directory if it doesn't exist
        storage_path = Path(settings.PDF_STORAGE_PATH)
        storage_path.mkdir(parents=True, exist_ok=True)

        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        draft_suffix = "_DRAFT" if is_draft else ""
        filename = f"{invoice.invoice_number}{draft_suffix}_{timestamp}.pdf"

        # Create company subdirectory
        company_path = storage_path / self.company_id
        company_path.mkdir(parents=True, exist_ok=True)

        # Write file
        file_path = company_path / filename
        file_path.write_bytes(pdf_bytes)

        # Return URL
        return f"{settings.PDF_BASE_URL}/{self.company_id}/{filename}"

    async def verify_pdf_integrity(self, invoice_id: str) -> bool:
        """Verify that the stored PDF matches its hash."""
        stmt = select(Invoice).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()

        if not invoice or not invoice.pdf_url or not invoice.pdf_sha256:
            return False

        # Extract file path from URL
        url_path = invoice.pdf_url.replace(settings.PDF_BASE_URL, "")
        file_path = Path(settings.PDF_STORAGE_PATH) / url_path.lstrip("/")

        if not file_path.exists():
            return False

        # Calculate current hash
        pdf_bytes = file_path.read_bytes()
        current_hash = hashlib.sha256(pdf_bytes).hexdigest()

        return current_hash == invoice.pdf_sha256


class PDFVerificationError(Exception):
    """Raised when PDF integrity verification fails."""

    pass
