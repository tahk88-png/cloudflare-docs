// PDF Generation Service with DRAFT/FINAL watermarks
// Uses a PDF generation library (in production, use PDFKit, jsPDF, or similar)

import type { Invoice, InvoiceItem, Customer, Company } from '../types';
import { formatCurrency } from '../utils/calculations';
import { createHash } from 'crypto';

export interface PDFGeneratorOptions {
  mode: 'draft' | 'final';
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  company: Company;
}

/**
 * Generate invoice PDF
 * In production, this would use PDFKit or similar library
 */
export async function generateInvoicePDF(options: PDFGeneratorOptions): Promise<{
  pdf: ArrayBuffer;
  sha256: string;
}> {
  const { mode, invoice, items, customer, company } = options;
  
  // Generate PDF content (simplified - in production use proper PDF library)
  const pdfContent = generatePDFContent(invoice, items, customer, company, mode);
  
  // Convert to ArrayBuffer
  const pdf = new TextEncoder().encode(pdfContent).buffer;
  
  // Calculate SHA256 hash
  const sha256 = await calculateSHA256(pdf);
  
  return { pdf, sha256 };
}

/**
 * Generate PDF HTML content (for HTML to PDF conversion)
 */
function generatePDFContent(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer,
  company: Company,
  mode: 'draft' | 'final'
): string {
  const isDraft = mode === 'draft';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      position: relative;
    }
    
    ${isDraft ? `
    body::before {
      content: "DRAFT";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.3);
      z-index: -1;
      pointer-events: none;
    }
    ` : ''}
    
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 10px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-title {
      font-size: 24pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .address-block {
      flex: 1;
    }
    
    .address-block h3 {
      margin: 0 0 10px 0;
      font-size: 11pt;
      color: #666;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th {
      background-color: #f5f5f5;
      border-bottom: 2px solid #333;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    
    .items-table td {
      border-bottom: 1px solid #ddd;
      padding: 10px;
    }
    
    .items-table tr:last-child td {
      border-bottom: 2px solid #333;
    }
    
    .text-right {
      text-align: right;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
      margin-bottom: 40px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    
    .totals-row.grand-total {
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 10px;
      font-weight: bold;
      font-size: 12pt;
    }
    
    .notes {
      margin-top: 40px;
      padding: 20px;
      background-color: #f9f9f9;
      border-left: 4px solid #333;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    
    .payment-info {
      margin-top: 30px;
      padding: 15px;
      background-color: #f0f8ff;
      border: 1px solid #add8e6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${company.logo_url ? `<img src="${company.logo_url}" class="company-logo" alt="${company.name}">` : ''}
      <h2>${company.name}</h2>
      <div>${company.address || ''}</div>
      <div>${company.postal_code || ''} ${company.city || ''}</div>
      <div>${company.country || ''}</div>
      ${company.vat_number ? `<div>VAT: ${company.vat_number}</div>` : ''}
      <div>Email: ${company.email}</div>
    </div>
    
    <div class="invoice-info">
      <div class="invoice-title">${invoice.invoice_type === 'credit_note' ? 'CREDIT NOTE' : 'INVOICE'}</div>
      <div><strong>Number:</strong> ${invoice.invoice_number}</div>
      <div><strong>Date:</strong> ${formatDate(invoice.issue_date)}</div>
      <div><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</div>
      ${invoice.status === 'paid' && invoice.paid_date ? `<div><strong>Paid:</strong> ${formatDate(invoice.paid_date)}</div>` : ''}
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
        <th class="text-right">Subtotal</th>
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
    <div class="payment-info">
      <strong>Pay Online:</strong><br>
      ${invoice.payment_link}
    </div>
  ` : ''}
  
  ${invoice.notes ? `
    <div class="notes">
      <strong>Notes:</strong><br>
      ${escapeHtml(invoice.notes)}
    </div>
  ` : ''}
  
  ${invoice.terms_and_conditions ? `
    <div class="notes">
      <strong>Terms and Conditions:</strong><br>
      ${escapeHtml(invoice.terms_and_conditions)}
    </div>
  ` : ''}
  
  <div class="footer">
    ${invoice.footer_text || `Thank you for your business!`}
    ${isDraft ? '<br><strong style="color: red;">This is a DRAFT invoice and is not valid for payment.</strong>' : ''}
  </div>
</body>
</html>
  `;
}

/**
 * Calculate SHA256 hash of PDF buffer
 */
async function calculateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Escape HTML special characters
 */
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

/**
 * Upload PDF to R2 storage
 */
export async function uploadPDFToR2(
  r2: R2Bucket,
  companyId: string,
  invoiceNumber: string,
  pdf: ArrayBuffer,
  mode: 'draft' | 'final'
): Promise<string> {
  const key = `invoices/${companyId}/${invoiceNumber}/${mode}.pdf`;
  
  await r2.put(key, pdf, {
    httpMetadata: {
      contentType: 'application/pdf',
    },
    customMetadata: {
      companyId,
      invoiceNumber,
      mode,
      generatedAt: new Date().toISOString(),
    },
  });
  
  // In production, you'd return a signed URL or CDN URL
  return `https://invoices.example.com/${key}`;
}

/**
 * Verify PDF integrity using SHA256 hash
 */
export async function verifyPDFIntegrity(
  r2: R2Bucket,
  pdfUrl: string,
  expectedHash: string
): Promise<boolean> {
  try {
    // Download PDF from R2
    const key = extractR2KeyFromUrl(pdfUrl);
    const object = await r2.get(key);
    
    if (!object) {
      return false;
    }
    
    const buffer = await object.arrayBuffer();
    const actualHash = await calculateSHA256(buffer);
    
    return actualHash === expectedHash;
  } catch (error) {
    console.error('PDF integrity verification failed:', error);
    return false;
  }
}

function extractR2KeyFromUrl(url: string): string {
  // Extract key from URL (simplified)
  const urlObj = new URL(url);
  return urlObj.pathname.substring(1); // Remove leading slash
}

// Type for R2Bucket (Cloudflare R2)
interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream, options?: {
    httpMetadata?: {
      contentType?: string;
    };
    customMetadata?: Record<string, string>;
  }): Promise<void>;
  
  get(key: string): Promise<{
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
}
