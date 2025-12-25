"""Public invoice view routes (no authentication required)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.company import Company
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.services.token import TokenService


router = APIRouter()


@router.get("/invoice-view/{token}")
async def view_invoice(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    View an invoice via secure token.
    
    - Token must be valid and not expired
    - Logs view with IP address and user agent
    - Updates invoice status to 'viewed' if currently 'sent'
    
    Returns an HTML page with invoice details and payment link.
    """
    token_service = TokenService(db)

    # Get client info
    ip_address = request.client.host if request.client else None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    user_agent = request.headers.get("user-agent")

    try:
        view_token, invoice = await token_service.validate_and_log_view(
            token=token,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    # Get company and customer for display
    company_stmt = (
        select(Company)
        .options(selectinload(Company.settings))
        .where(Company.id == invoice.company_id)
    )
    company_result = await db.execute(company_stmt)
    company = company_result.scalar_one()

    # Use customer snapshot if available, otherwise get current customer
    customer_data = invoice.customer_snapshot or {}
    if not customer_data:
        customer_stmt = select(Customer).where(Customer.id == invoice.customer_id)
        customer_result = await db.execute(customer_stmt)
        customer = customer_result.scalar_one_or_none()
        if customer:
            customer_data = {
                "name": customer.name,
                "email": customer.email,
                "address_line1": customer.address_line1,
                "city": customer.city,
                "postal_code": customer.postal_code,
                "country": customer.country,
            }

    # Generate HTML response
    html_content = generate_invoice_view_html(invoice, company, customer_data)

    return HTMLResponse(content=html_content)


@router.get("/invoice-view/{token}/pdf")
async def download_invoice_pdf(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Download invoice PDF via secure token.
    
    Returns the PDF file if available.
    """
    token_service = TokenService(db)

    # Validate token (don't log as a new view, just check validity)
    view_token = await token_service.get_by_token(token)
    if not view_token or not view_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired token",
        )

    # Get invoice
    stmt = select(Invoice).where(Invoice.id == view_token.invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()

    if not invoice or not invoice.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not available",
        )

    # Log PDF download
    ip_address = request.client.host if request.client else None
    await token_service.log_pdf_download(token, ip_address)
    await db.commit()

    # Extract file path from URL and return file
    from pathlib import Path
    url_path = invoice.pdf_url.replace(settings.PDF_BASE_URL, "")
    file_path = Path(settings.PDF_STORAGE_PATH) / url_path.lstrip("/")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found",
        )

    return FileResponse(
        path=str(file_path),
        filename=f"{invoice.invoice_number}.pdf",
        media_type="application/pdf",
    )


@router.get("/invoice-view/{token}/pay")
async def redirect_to_payment(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Redirect to payment link via secure token.
    
    Logs the click and redirects to the payment URL.
    """
    token_service = TokenService(db)

    # Validate token
    view_token = await token_service.get_by_token(token)
    if not view_token or not view_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired token",
        )

    # Get invoice
    stmt = select(Invoice).where(Invoice.id == view_token.invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()

    if not invoice or not invoice.payment_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment link not available",
        )

    # Log payment link click
    ip_address = request.client.host if request.client else None
    await token_service.log_payment_link_click(token, ip_address)
    await db.commit()

    return RedirectResponse(url=invoice.payment_link)


@router.get("/payment-success")
async def payment_success(
    session_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Payment success landing page.
    """
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Successful</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f8fafc;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
            }
            .icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            h1 {
                color: #10b981;
                margin-bottom: 10px;
            }
            p {
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Thank you for your payment. You will receive a confirmation email shortly.</p>
        </div>
    </body>
    </html>
    """)


@router.get("/payment-cancelled")
async def payment_cancelled():
    """
    Payment cancelled landing page.
    """
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Cancelled</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f8fafc;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
            }
            .icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            h1 {
                color: #f59e0b;
                margin-bottom: 10px;
            }
            p {
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">⚠</div>
            <h1>Payment Cancelled</h1>
            <p>Your payment was cancelled. If this was a mistake, you can return to the invoice and try again.</p>
        </div>
    </body>
    </html>
    """)


def generate_invoice_view_html(invoice: Invoice, company: Company, customer_data: dict) -> str:
    """Generate HTML for invoice viewing."""
    # Format currency
    def fmt_currency(amount_cents: int, currency: str = "EUR") -> str:
        symbols = {"EUR": "€", "USD": "$", "GBP": "£"}
        symbol = symbols.get(currency, currency)
        return f"{symbol}{amount_cents / 100:,.2f}"

    items_html = ""
    for item in invoice.items:
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">{item.description}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">{item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">{fmt_currency(item.unit_price, invoice.currency)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">{item.vat_rate}%</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">{fmt_currency(item.line_total, invoice.currency)}</td>
        </tr>
        """

    payment_button = ""
    if invoice.payment_link and invoice.status.value not in ["paid", "void", "cancelled"]:
        payment_button = f"""
        <div style="margin-top: 30px; text-align: center;">
            <a href="{invoice.payment_link}" 
               style="display: inline-block; padding: 16px 32px; background: #2563eb; 
                      color: white; text-decoration: none; border-radius: 8px; 
                      font-weight: 600; font-size: 16px;">
                Pay Now - {fmt_currency(invoice.amount_due, invoice.currency)}
            </a>
        </div>
        """

    status_badge = f"""
    <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; 
                 font-size: 12px; font-weight: 600; text-transform: uppercase;
                 background: {'#dcfce7' if invoice.status.value == 'paid' else '#fef3c7' if invoice.status.value in ['sent', 'viewed'] else '#fee2e2'};
                 color: {'#166534' if invoice.status.value == 'paid' else '#92400e' if invoice.status.value in ['sent', 'viewed'] else '#991b1b'};">
        {invoice.status.value}
    </span>
    """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice {invoice.invoice_number}</title>
        <style>
            * {{ box-sizing: border-box; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f1f5f9;
                color: #1e293b;
            }}
            .invoice-container {{
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: #2563eb;
                color: white;
                padding: 30px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }}
            .company-name {{
                font-size: 24px;
                font-weight: 700;
            }}
            .invoice-title {{
                text-align: right;
            }}
            .invoice-number {{
                font-size: 14px;
                opacity: 0.9;
            }}
            .content {{
                padding: 30px;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }}
            .info-section h3 {{
                font-size: 12px;
                text-transform: uppercase;
                color: #64748b;
                margin: 0 0 10px 0;
            }}
            .info-section p {{
                margin: 4px 0;
            }}
            .items-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            .items-table th {{
                background: #f8fafc;
                padding: 12px;
                text-align: left;
                font-size: 12px;
                text-transform: uppercase;
                color: #64748b;
            }}
            .totals {{
                margin-left: auto;
                width: 300px;
            }}
            .totals-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
            }}
            .totals-row.total {{
                font-size: 18px;
                font-weight: 700;
                border-top: 2px solid #2563eb;
                margin-top: 10px;
                padding-top: 15px;
            }}
            .download-btn {{
                display: inline-block;
                padding: 10px 20px;
                background: #f1f5f9;
                color: #475569;
                text-decoration: none;
                border-radius: 6px;
                font-size: 14px;
            }}
            .download-btn:hover {{
                background: #e2e8f0;
            }}
            @media (max-width: 600px) {{
                .info-grid {{
                    grid-template-columns: 1fr;
                }}
                .header {{
                    flex-direction: column;
                    gap: 20px;
                }}
                .invoice-title {{
                    text-align: left;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div>
                    <div class="company-name">{company.name}</div>
                    <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">
                        {company.address_line1 or ''}<br>
                        {company.postal_code or ''} {company.city or ''}, {company.country}
                    </div>
                </div>
                <div class="invoice-title">
                    <div style="font-size: 28px; font-weight: 700;">INVOICE</div>
                    <div class="invoice-number">#{invoice.invoice_number}</div>
                </div>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    {status_badge}
                </div>
                
                <div class="info-grid">
                    <div class="info-section">
                        <h3>Bill To</h3>
                        <p><strong>{customer_data.get('name', '')}</strong></p>
                        <p>{customer_data.get('address_line1', '')}</p>
                        <p>{customer_data.get('postal_code', '')} {customer_data.get('city', '')}</p>
                        <p>{customer_data.get('country', '')}</p>
                    </div>
                    <div class="info-section">
                        <h3>Invoice Details</h3>
                        <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                        <p><strong>Issue Date:</strong> {invoice.issue_date.strftime('%Y-%m-%d')}</p>
                        <p><strong>Due Date:</strong> {invoice.due_date.strftime('%Y-%m-%d')}</p>
                        {f'<p><strong>Reference:</strong> {invoice.reference}</p>' if invoice.reference else ''}
                    </div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Qty</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">VAT</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="totals-row">
                        <span>Subtotal</span>
                        <span>{fmt_currency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div class="totals-row">
                        <span>VAT</span>
                        <span>{fmt_currency(invoice.total_vat, invoice.currency)}</span>
                    </div>
                    <div class="totals-row total">
                        <span>Total Due</span>
                        <span>{fmt_currency(invoice.amount_due, invoice.currency)}</span>
                    </div>
                </div>
                
                {payment_button}
                
                <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <a href="pdf" class="download-btn">📄 Download PDF</a>
                </div>
                
                {f'<div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;"><strong>Notes:</strong><br>{invoice.notes}</div>' if invoice.notes else ''}
            </div>
        </div>
    </body>
    </html>
    """
