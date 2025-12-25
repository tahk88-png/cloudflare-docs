// PDF generation handlers

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, InvoiceItem, Customer, Company, GeneratePDFRequest } from '../types';
import { requirePermission, requireCompanyAccess } from '../services/auth-service';
import { generateInvoicePDF, uploadPDFToR2 } from '../services/pdf-generator';
import { auditActions } from '../services/audit-service';

/**
 * POST /api/invoices/:id/generate-pdf - Generate PDF for invoice
 */
export async function generatePDF(
  db: D1Database,
  r2: any,
  request: Request,
  invoiceId: string,
  body: GeneratePDFRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canViewInvoice');
    
    // Get invoice
    const invoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(invoiceId)
      .first<Invoice>();
    
    if (!invoice) {
      return jsonError('Invoice not found', 404);
    }
    
    // Check company access
    await requireCompanyAccess(user, invoice.company_id);
    
    // Check if invoice is final and PDF is immutable
    if (invoice.is_pdf_final && body.mode === 'final') {
      return jsonError('Invoice PDF is final and immutable. Cannot regenerate.', 400);
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
      return jsonError('Related data not found', 404);
    }
    
    // Generate PDF
    const { pdf, sha256 } = await generateInvoicePDF({
      mode: body.mode,
      invoice,
      items,
      customer,
      company,
    });
    
    // Upload to R2
    const pdfUrl = await uploadPDFToR2(
      r2,
      company.id,
      invoice.invoice_number,
      pdf,
      body.mode
    );
    
    // Update invoice with PDF details
    if (body.mode === 'final') {
      await db
        .prepare(
          `UPDATE invoices 
           SET pdf_url = ?, pdf_sha256 = ?, pdf_generated_at = datetime('now'),
               is_pdf_final = 1, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(pdfUrl, sha256, invoiceId)
        .run();
    } else {
      // Draft mode - don't mark as final
      await db
        .prepare(
          `UPDATE invoices 
           SET pdf_url = ?, pdf_sha256 = ?, pdf_generated_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(pdfUrl, sha256, invoiceId)
        .run();
    }
    
    // Audit log
    await auditActions.invoice.pdfGenerated(
      db,
      user.company_id,
      user.id,
      invoiceId,
      body.mode,
      pdfUrl,
      request
    );
    
    return jsonResponse({
      pdf_url: pdfUrl,
      pdf_sha256: sha256,
      mode: body.mode,
      is_final: body.mode === 'final',
    });
  } catch (error: any) {
    console.error('Generate PDF error:', error);
    return jsonError(error.message, error.message.includes('Unauthorized') ? 401 : error.message.includes('Forbidden') ? 403 : 500);
  }
}

/**
 * Helper functions
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
