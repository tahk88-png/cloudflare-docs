"""Invoice template model."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company


class InvoiceTemplate(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """Invoice PDF template."""

    __tablename__ = "invoice_templates"

    # Tenant
    company_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Template Info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Template Content
    html_template: Mapped[str] = mapped_column(Text, nullable=False)
    css_styles: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Page Settings
    page_size: Mapped[str] = mapped_column(String(10), default="A4")  # A4, Letter, etc.
    page_orientation: Mapped[str] = mapped_column(
        String(10), default="portrait"
    )  # portrait, landscape
    margin_top: Mapped[str] = mapped_column(String(20), default="20mm")
    margin_right: Mapped[str] = mapped_column(String(20), default="15mm")
    margin_bottom: Mapped[str] = mapped_column(String(20), default="20mm")
    margin_left: Mapped[str] = mapped_column(String(20), default="15mm")

    # Header/Footer
    header_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Customization Options
    primary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    secondary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    font_family: Mapped[str] = mapped_column(String(100), default="Arial, sans-serif")

    # Additional settings as JSON
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationship
    company: Mapped["Company"] = relationship("Company", back_populates="templates")


# Default invoice template HTML
DEFAULT_INVOICE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ invoice.invoice_number }}</title>
</head>
<body>
    {% if is_draft %}
    <div class="watermark">DRAFT</div>
    {% endif %}
    
    <header class="invoice-header">
        <div class="company-info">
            {% if company.logo_url %}
            <img src="{{ company.logo_url }}" alt="{{ company.name }}" class="company-logo">
            {% endif %}
            <h1>{{ company.name }}</h1>
            {% if company.legal_name and company.legal_name != company.name %}
            <p class="legal-name">{{ company.legal_name }}</p>
            {% endif %}
            <p>{{ company.address_line1 }}</p>
            {% if company.address_line2 %}<p>{{ company.address_line2 }}</p>{% endif %}
            <p>{{ company.postal_code }} {{ company.city }}, {{ company.country }}</p>
            {% if company.vat_number %}<p>VAT: {{ company.vat_number }}</p>{% endif %}
            {% if company.registration_number %}<p>Reg: {{ company.registration_number }}</p>{% endif %}
        </div>
        
        <div class="invoice-info">
            <h2>{% if invoice.invoice_type == 'credit_note' %}CREDIT NOTE{% else %}INVOICE{% endif %}</h2>
            <table class="invoice-details">
                <tr>
                    <td>Number:</td>
                    <td><strong>{{ invoice.invoice_number }}</strong></td>
                </tr>
                <tr>
                    <td>Issue Date:</td>
                    <td>{{ invoice.issue_date.strftime('%Y-%m-%d') }}</td>
                </tr>
                <tr>
                    <td>Due Date:</td>
                    <td>{{ invoice.due_date.strftime('%Y-%m-%d') }}</td>
                </tr>
                {% if invoice.reference %}
                <tr>
                    <td>Reference:</td>
                    <td>{{ invoice.reference }}</td>
                </tr>
                {% endif %}
            </table>
        </div>
    </header>
    
    <section class="customer-section">
        <h3>Bill To:</h3>
        <div class="customer-info">
            <p><strong>{{ customer.name }}</strong></p>
            {% if customer.contact_person %}<p>Attn: {{ customer.contact_person }}</p>{% endif %}
            <p>{{ customer.address_line1 }}</p>
            {% if customer.address_line2 %}<p>{{ customer.address_line2 }}</p>{% endif %}
            <p>{{ customer.postal_code }} {{ customer.city }}, {{ customer.country }}</p>
            {% if customer.vat_number %}<p>VAT: {{ customer.vat_number }}</p>{% endif %}
        </div>
    </section>
    
    <section class="items-section">
        <table class="items-table">
            <thead>
                <tr>
                    <th class="description">Description</th>
                    <th class="quantity">Qty</th>
                    <th class="unit">Unit</th>
                    <th class="unit-price">Unit Price</th>
                    <th class="vat">VAT %</th>
                    <th class="total">Total</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td class="description">{{ item.description }}</td>
                    <td class="quantity">{{ item.quantity }}</td>
                    <td class="unit">{{ item.unit or 'pcs' }}</td>
                    <td class="unit-price">{{ format_currency(item.unit_price_decimal, invoice.currency) }}</td>
                    <td class="vat">{{ item.vat_rate }}%</td>
                    <td class="total">{{ format_currency(item.line_total_decimal, invoice.currency) }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </section>
    
    <section class="totals-section">
        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td>{{ format_currency(invoice.subtotal_decimal, invoice.currency) }}</td>
            </tr>
            {% if invoice.discount_amount > 0 %}
            <tr>
                <td>Discount:</td>
                <td>-{{ format_currency(invoice.discount_amount / 100, invoice.currency) }}</td>
            </tr>
            {% endif %}
            {% for rate, amount in vat_breakdown.items() %}
            <tr>
                <td>VAT {{ rate }}%:</td>
                <td>{{ format_currency(amount / 100, invoice.currency) }}</td>
            </tr>
            {% endfor %}
            <tr class="total-row">
                <td><strong>Total:</strong></td>
                <td><strong>{{ format_currency(invoice.total_decimal, invoice.currency) }}</strong></td>
            </tr>
        </table>
    </section>
    
    {% if payment_info %}
    <section class="payment-section">
        <h3>Payment Information</h3>
        <table class="payment-table">
            {% if payment_info.bank_name %}
            <tr><td>Bank:</td><td>{{ payment_info.bank_name }}</td></tr>
            {% endif %}
            {% if payment_info.bank_iban %}
            <tr><td>IBAN:</td><td>{{ payment_info.bank_iban }}</td></tr>
            {% endif %}
            {% if payment_info.bank_swift %}
            <tr><td>SWIFT/BIC:</td><td>{{ payment_info.bank_swift }}</td></tr>
            {% endif %}
        </table>
        <p class="payment-reference">Please use invoice number <strong>{{ invoice.invoice_number }}</strong> as payment reference.</p>
    </section>
    {% endif %}
    
    {% if invoice.notes %}
    <section class="notes-section">
        <h3>Notes</h3>
        <p>{{ invoice.notes }}</p>
    </section>
    {% endif %}
    
    {% if invoice.terms %}
    <section class="terms-section">
        <h3>Terms & Conditions</h3>
        <p>{{ invoice.terms }}</p>
    </section>
    {% endif %}
    
    <footer class="invoice-footer">
        {% if invoice.footer %}
        <p>{{ invoice.footer }}</p>
        {% endif %}
        <p class="thank-you">Thank you for your business!</p>
    </footer>
</body>
</html>
"""

DEFAULT_INVOICE_CSS = """
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: {{ font_family }};
    font-size: 10pt;
    line-height: 1.5;
    color: #333;
}

.watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 100pt;
    color: rgba(200, 0, 0, 0.1);
    font-weight: bold;
    z-index: -1;
    pointer-events: none;
}

.invoice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid {{ primary_color or '#2563eb' }};
}

.company-info h1 {
    color: {{ primary_color or '#2563eb' }};
    font-size: 18pt;
    margin-bottom: 10px;
}

.company-logo {
    max-width: 150px;
    max-height: 60px;
    margin-bottom: 10px;
}

.invoice-info {
    text-align: right;
}

.invoice-info h2 {
    color: {{ primary_color or '#2563eb' }};
    font-size: 24pt;
    margin-bottom: 15px;
}

.invoice-details td {
    padding: 2px 10px;
}

.invoice-details td:first-child {
    text-align: right;
    color: #666;
}

.customer-section {
    margin-bottom: 30px;
}

.customer-section h3 {
    color: #666;
    font-size: 9pt;
    text-transform: uppercase;
    margin-bottom: 5px;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.items-table th {
    background-color: {{ primary_color or '#2563eb' }};
    color: white;
    padding: 10px;
    text-align: left;
    font-size: 9pt;
}

.items-table td {
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.items-table .quantity,
.items-table .unit,
.items-table .unit-price,
.items-table .vat,
.items-table .total {
    text-align: right;
    white-space: nowrap;
}

.totals-section {
    margin-left: auto;
    width: 300px;
}

.totals-table {
    width: 100%;
}

.totals-table td {
    padding: 5px 10px;
}

.totals-table td:first-child {
    text-align: right;
    color: #666;
}

.totals-table td:last-child {
    text-align: right;
}

.totals-table .total-row {
    border-top: 2px solid {{ primary_color or '#2563eb' }};
    font-size: 12pt;
}

.payment-section,
.notes-section,
.terms-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.payment-section h3,
.notes-section h3,
.terms-section h3 {
    color: {{ primary_color or '#2563eb' }};
    font-size: 11pt;
    margin-bottom: 10px;
}

.payment-table td {
    padding: 3px 10px 3px 0;
}

.payment-reference {
    margin-top: 10px;
    font-size: 9pt;
    color: #666;
}

.invoice-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    text-align: center;
    color: #666;
    font-size: 9pt;
}

.thank-you {
    margin-top: 10px;
    font-style: italic;
    color: {{ primary_color or '#2563eb' }};
}

@media print {
    @page {
        size: {{ page_size }} {{ page_orientation }};
        margin: {{ margin_top }} {{ margin_right }} {{ margin_bottom }} {{ margin_left }};
    }
}
"""
