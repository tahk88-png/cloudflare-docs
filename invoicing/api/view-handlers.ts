// Invoice view handlers (public access via token)

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, InvoiceItem, Customer, Company } from '../types';
import { verifyViewToken } from '../services/view-token-service';

/**
 * GET /invoice-view/:token - Public invoice view with secure token
 */
export async function viewInvoiceByToken(
  db: D1Database,
  request: Request,
  token: string
): Promise<Response> {
  try {
    // Verify token
    const verification = await verifyViewToken(db, token, request);
    
    if (!verification.valid) {
      return htmlError(verification.error || 'Invalid token', 403);
    }
    
    const invoiceId = verification.invoiceId!;
    
    // Get invoice
    const invoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(invoiceId)
      .first<Invoice>();
    
    if (!invoice) {
      return htmlError('Invoice not found', 404);
    }
    
    // Get items
    const itemsResult = await db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order')
      .bind(invoiceId)
      .all<InvoiceItem>();
    
    const items = itemsResult.results || [];
    
    // Get customer
    const customer = await db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .bind(invoice.customer_id)
      .first<Customer>();
    
    // Get company
    const company = await db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .bind(invoice.company_id)
      .first<Company>();
    
    if (!customer || !company) {
      return htmlError('Related data not found', 404);
    }
    
    // Render invoice HTML
    const html = renderInvoiceHTML(invoice, items, customer, company);
    
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('View invoice error:', error);
    return htmlError('Internal server error', 500);
  }
}

/**
 * Render invoice as HTML
 */
function renderInvoiceHTML(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer,
  company: Company
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number} - ${company.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    
    .company-info h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
    
    .status-draft { background-color: #6c757d; color: white; }
    .status-sent { background-color: #17a2b8; color: white; }
    .status-paid { background-color: #28a745; color: white; }
    .status-overdue { background-color: #dc3545; color: white; }
    .status-payment_pending { background-color: #ffc107; color: #333; }
    
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .address-block h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th {
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    .items-table td {
      border-bottom: 1px solid #dee2e6;
      padding: 12px;
    }
    
    .items-table tr:last-child td {
      border-bottom: 2px solid #333;
    }
    
    .text-right {
      text-align: right;
    }
    
    .totals {
      margin-left: auto;
      width: 350px;
      margin-bottom: 40px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    
    .totals-row.grand-total {
      border-top: 2px solid #333;
      padding-top: 15px;
      margin-top: 10px;
      font-weight: bold;
      font-size: 20px;
    }
    
    .payment-link {
      background-color: #007bff;
      color: white;
      padding: 15px 30px;
      text-align: center;
      border-radius: 5px;
      margin: 30px 0;
      font-weight: bold;
    }
    
    .payment-link a {
      color: white;
      text-decoration: none;
      display: block;
    }
    
    .notes {
      margin-top: 40px;
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 4px solid #007bff;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
      
      .payment-link {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-width: 200px; max-height: 80px; margin-bottom: 15px;">` : ''}
        <h1>${company.name}</h1>
        <div>${company.address || ''}</div>
        <div>${company.postal_code || ''} ${company.city || ''}</div>
        <div>${company.country || ''}</div>
        ${company.vat_number ? `<div>VAT: ${company.vat_number}</div>` : ''}
        <div>${company.email}</div>
      </div>
      
      <div class="invoice-info">
        <div class="invoice-title">${invoice.invoice_type === 'credit_note' ? 'CREDIT NOTE' : 'INVOICE'}</div>
        <div><strong>Number:</strong> ${invoice.invoice_number}</div>
        <div><strong>Date:</strong> ${formatDate(invoice.issue_date)}</div>
        <div><strong>Due:</strong> ${formatDate(invoice.due_date)}</div>
        ${invoice.paid_date ? `<div><strong>Paid:</strong> ${formatDate(invoice.paid_date)}</div>` : ''}
        <div class="status-badge status-${invoice.status}">${invoice.status.toUpperCase().replace('_', ' ')}</div>
      </div>
    </div>
    
    <div class="addresses">
      <div class="address-block">
        <h3>Bill To:</h3>
        <div><strong>${customer.name}</strong></div>
        <div>${customer.address || ''}</div>
        <div>${customer.postal_code || ''} ${customer.city || ''}</div>
        <div>${customer.country || ''}</div>
        ${customer.vat_number ? `<div>VAT: ${customer.vat_number}</div>` : ''}
        <div>${customer.email}</div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">VAT</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${escapeHtml(item.description)}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unit_price, invoice.currency)}</td>
            <td class="text-right">${item.vat_rate}%</td>
            <td class="text-right">${formatCurrency(item.total, invoice.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      <div class="totals-row">
        <span>VAT:</span>
        <span>${formatCurrency(invoice.vat_amount, invoice.currency)}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Total:</span>
        <span>${formatCurrency(invoice.total, invoice.currency)}</span>
      </div>
      ${invoice.paid_amount > 0 ? `
        <div class="totals-row">
          <span>Paid:</span>
          <span>${formatCurrency(invoice.paid_amount, invoice.currency)}</span>
        </div>
        <div class="totals-row">
          <span>Balance Due:</span>
          <span>${formatCurrency(invoice.total - invoice.paid_amount, invoice.currency)}</span>
        </div>
      ` : ''}
    </div>
    
    ${invoice.payment_link && invoice.status !== 'paid' ? `
      <div class="payment-link">
        <a href="${invoice.payment_link}">Pay Now Online</a>
      </div>
    ` : ''}
    
    ${invoice.notes ? `
      <div class="notes">
        <strong>Notes:</strong><br>
        ${escapeHtml(invoice.notes).replace(/\n/g, '<br>')}
      </div>
    ` : ''}
    
    ${invoice.terms_and_conditions ? `
      <div class="notes">
        <strong>Terms and Conditions:</strong><br>
        ${escapeHtml(invoice.terms_and_conditions).replace(/\n/g, '<br>')}
      </div>
    ` : ''}
    
    <div class="footer">
      ${invoice.footer_text || 'Thank you for your business!'}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Helper functions
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function htmlError(message: string, status: number): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .error-box {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }
    .error-code {
      font-size: 48px;
      font-weight: bold;
      color: #dc3545;
      margin-bottom: 20px;
    }
    .error-message {
      font-size: 18px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="error-box">
    <div class="error-code">${status}</div>
    <div class="error-message">${escapeHtml(message)}</div>
  </div>
</body>
</html>
  `;
  
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
