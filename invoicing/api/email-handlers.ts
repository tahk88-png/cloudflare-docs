// Email sending handlers

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, Customer, Company, SendEmailRequest } from '../types';
import { requirePermission, requireCompanyAccess } from '../services/auth-service';
import { queueEmail, type EmailProvider } from '../services/email-service';
import { generateViewToken, generateViewUrl } from '../services/view-token-service';
import { auditActions } from '../services/audit-service';

/**
 * POST /api/invoices/:id/send-email - Send invoice via email
 */
export async function sendInvoiceEmail(
  db: D1Database,
  emailProvider: EmailProvider,
  request: Request,
  invoiceId: string,
  body: SendEmailRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canSendInvoice');
    
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
    
    // Check if invoice is in draft status
    if (invoice.status === 'draft') {
      // Need to finalize invoice before sending
      if (!invoice.is_pdf_final) {
        return jsonError('Invoice must have a final PDF before sending. Generate final PDF first.', 400);
      }
      
      // Update status to sent
      await db
        .prepare(
          `UPDATE invoices 
           SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(invoiceId)
        .run();
      
      // Refresh invoice
      const updatedInvoice = await db
        .prepare('SELECT * FROM invoices WHERE id = ?')
        .bind(invoiceId)
        .first<Invoice>();
      
      if (updatedInvoice) {
        Object.assign(invoice, updatedInvoice);
      }
    }
    
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
    
    // Generate view token if not exists
    let viewToken = await db
      .prepare(
        `SELECT * FROM invoice_view_tokens
         WHERE invoice_id = ? AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(invoiceId)
      .first();
    
    if (!viewToken) {
      viewToken = await generateViewToken(db, invoiceId);
    }
    
    const viewUrl = generateViewUrl(viewToken.token);
    
    // Update invoice with view URL
    await db
      .prepare(
        `UPDATE invoices 
         SET pdf_url = ?, updated_at = datetime('now')
         WHERE id = ? AND (pdf_url IS NULL OR pdf_url = '')`
      )
      .bind(viewUrl, invoiceId)
      .run();
    
    // Queue email
    const emailLog = await queueEmail(db, {
      invoice,
      customer,
      company,
      recipientEmail: body.recipient_email,
      subject: body.subject,
      bodyHtml: body.body,
      attachmentUrl: body.include_pdf ? invoice.pdf_url : undefined,
      attachmentName: body.include_pdf ? `invoice-${invoice.invoice_number}.pdf` : undefined,
    });
    
    // Audit log
    await auditActions.invoice.sent(
      db,
      user.company_id,
      user.id,
      invoiceId,
      body.recipient_email || customer.email,
      request
    );
    
    return jsonResponse({
      email_id: emailLog.id,
      status: emailLog.status,
      recipient: emailLog.recipient_email,
      view_url: viewUrl,
      message: 'Invoice email queued for delivery',
    });
  } catch (error: any) {
    console.error('Send invoice email error:', error);
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
