// Invoice API handlers

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  Invoice, 
  InvoiceItem, 
  Customer, 
  Company, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  InvoiceResponse 
} from '../types';
import { generateId } from '../utils/id';
import { generateInvoiceNumber } from '../utils/invoice-number';
import { calculateLineItem, calculateInvoiceTotals, calculateDueDate, isValidVatRate } from '../utils/calculations';
import { requirePermission, requireCompanyAccess } from '../services/auth-service';
import { auditActions } from '../services/audit-service';
import { generateInvoicePDF, uploadPDFToR2 } from '../services/pdf-generator';
import { queueEmail, type EmailProvider } from '../services/email-service';
import { generateViewToken, generateViewUrl } from '../services/view-token-service';

/**
 * POST /api/invoices - Create new invoice
 */
export async function createInvoice(
  db: D1Database,
  r2: any,
  request: Request,
  body: CreateInvoiceRequest
): Promise<Response> {
  try {
    // Authenticate and authorize
    const user = await requirePermission(db, request, 'canCreateInvoice');
    
    // Validate customer belongs to same company
    const customer = await db
      .prepare('SELECT * FROM customers WHERE id = ? AND company_id = ?')
      .bind(body.customer_id, user.company_id)
      .first<Customer>();
    
    if (!customer) {
      return jsonError('Customer not found', 404);
    }
    
    // Get company details
    const company = await db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .bind(user.company_id)
      .first<Company>();
    
    if (!company) {
      return jsonError('Company not found', 404);
    }
    
    // Validate items
    if (!body.items || body.items.length === 0) {
      return jsonError('At least one item is required', 400);
    }
    
    for (const item of body.items) {
      if (!isValidVatRate(item.vat_rate)) {
        return jsonError(`Invalid VAT rate: ${item.vat_rate}. Must be 0, 9, or 22`, 400);
      }
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(db, user.company_id, company.invoice_prefix);
    
    // Calculate due date
    const issueDate = new Date(body.issue_date);
    const dueDate = body.due_date 
      ? new Date(body.due_date)
      : calculateDueDate(issueDate, customer.payment_terms);
    
    // Create invoice
    const invoiceId = generateId('inv');
    const invoice: Invoice = {
      id: invoiceId,
      company_id: user.company_id,
      customer_id: body.customer_id,
      invoice_number: invoiceNumber,
      invoice_type: 'invoice',
      status: 'draft',
      issue_date: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
      currency: 'EUR',
      subtotal: 0,
      vat_amount: 0,
      total: 0,
      paid_amount: 0,
      is_pdf_final: false,
      reminder_count: 0,
      view_count: 0,
      notes: body.notes,
      internal_notes: body.internal_notes,
      terms_and_conditions: body.terms_and_conditions,
      footer_text: body.footer_text,
      reminder_settings: body.reminder_settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
    };
    
    // Calculate and create items
    const items: InvoiceItem[] = [];
    for (let i = 0; i < body.items.length; i++) {
      const itemData = body.items[i];
      const { subtotal, vatAmount, total } = calculateLineItem(
        itemData.quantity,
        itemData.unit_price,
        itemData.vat_rate
      );
      
      const item: InvoiceItem = {
        id: generateId('item'),
        invoice_id: invoiceId,
        description: itemData.description,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        vat_rate: itemData.vat_rate,
        subtotal,
        vat_amount: vatAmount,
        total,
        sort_order: i,
        created_at: new Date().toISOString(),
      };
      
      items.push(item);
    }
    
    // Calculate invoice totals
    const totals = calculateInvoiceTotals(items);
    invoice.subtotal = totals.subtotal;
    invoice.vat_amount = totals.vatAmount;
    invoice.total = totals.total;
    
    // Insert invoice
    await db
      .prepare(
        `INSERT INTO invoices (
          id, company_id, customer_id, invoice_number, invoice_type, status,
          issue_date, due_date, currency, subtotal, vat_amount, total, paid_amount,
          is_pdf_final, reminder_count, view_count, notes, internal_notes,
          terms_and_conditions, footer_text, reminder_settings,
          created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        invoice.id, invoice.company_id, invoice.customer_id, invoice.invoice_number,
        invoice.invoice_type, invoice.status, invoice.issue_date, invoice.due_date,
        invoice.currency, invoice.subtotal, invoice.vat_amount, invoice.total,
        invoice.paid_amount, invoice.is_pdf_final ? 1 : 0, invoice.reminder_count,
        invoice.view_count, invoice.notes, invoice.internal_notes,
        invoice.terms_and_conditions, invoice.footer_text,
        invoice.reminder_settings ? JSON.stringify(invoice.reminder_settings) : null,
        invoice.created_at, invoice.updated_at, invoice.created_by
      )
      .run();
    
    // Insert items
    for (const item of items) {
      await db
        .prepare(
          `INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, vat_rate,
            subtotal, vat_amount, total, sort_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          item.id, item.invoice_id, item.description, item.quantity,
          item.unit_price, item.vat_rate, item.subtotal, item.vat_amount,
          item.total, item.sort_order, item.created_at
        )
        .run();
    }
    
    // Audit log
    await auditActions.invoice.created(db, user.company_id, user.id, invoice.id, invoice, request);
    
    const response: InvoiceResponse = {
      invoice,
      items,
      customer,
      company,
    };
    
    return jsonResponse(response, 201);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    return jsonError(error.message, error.message.includes('Unauthorized') ? 401 : error.message.includes('Forbidden') ? 403 : 500);
  }
}

/**
 * GET /api/invoices/:id - Get invoice details
 */
export async function getInvoice(
  db: D1Database,
  request: Request,
  invoiceId: string
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
    
    const response: InvoiceResponse = {
      invoice,
      items,
      customer,
      company,
    };
    
    return jsonResponse(response);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    return jsonError(error.message, error.message.includes('Unauthorized') ? 401 : error.message.includes('Forbidden') ? 403 : 500);
  }
}

/**
 * PUT /api/invoices/:id - Update invoice (draft only)
 */
export async function updateInvoice(
  db: D1Database,
  request: Request,
  invoiceId: string,
  body: UpdateInvoiceRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canEditInvoice');
    
    // Get existing invoice
    const existingInvoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(invoiceId)
      .first<Invoice>();
    
    if (!existingInvoice) {
      return jsonError('Invoice not found', 404);
    }
    
    // Check company access
    await requireCompanyAccess(user, existingInvoice.company_id);
    
    // Can only edit draft invoices
    if (existingInvoice.status !== 'draft') {
      return jsonError('Cannot edit non-draft invoice. Create a credit note instead.', 400);
    }
    
    // Update invoice fields
    const updates: string[] = [];
    const params: any[] = [];
    
    if (body.customer_id) {
      // Validate customer
      const customer = await db
        .prepare('SELECT * FROM customers WHERE id = ? AND company_id = ?')
        .bind(body.customer_id, user.company_id)
        .first<Customer>();
      
      if (!customer) {
        return jsonError('Customer not found', 404);
      }
      
      updates.push('customer_id = ?');
      params.push(body.customer_id);
    }
    
    if (body.issue_date) {
      updates.push('issue_date = ?');
      params.push(new Date(body.issue_date).toISOString());
    }
    
    if (body.due_date) {
      updates.push('due_date = ?');
      params.push(new Date(body.due_date).toISOString());
    }
    
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      params.push(body.notes);
    }
    
    if (body.internal_notes !== undefined) {
      updates.push('internal_notes = ?');
      params.push(body.internal_notes);
    }
    
    if (body.terms_and_conditions !== undefined) {
      updates.push('terms_and_conditions = ?');
      params.push(body.terms_and_conditions);
    }
    
    if (body.footer_text !== undefined) {
      updates.push('footer_text = ?');
      params.push(body.footer_text);
    }
    
    if (body.reminder_settings !== undefined) {
      updates.push('reminder_settings = ?');
      params.push(JSON.stringify(body.reminder_settings));
    }
    
    // Update items if provided
    if (body.items) {
      // Validate VAT rates
      for (const item of body.items) {
        if (!isValidVatRate(item.vat_rate)) {
          return jsonError(`Invalid VAT rate: ${item.vat_rate}`, 400);
        }
      }
      
      // Delete existing items
      await db
        .prepare('DELETE FROM invoice_items WHERE invoice_id = ?')
        .bind(invoiceId)
        .run();
      
      // Create new items
      const items: InvoiceItem[] = [];
      for (let i = 0; i < body.items.length; i++) {
        const itemData = body.items[i];
        const { subtotal, vatAmount, total } = calculateLineItem(
          itemData.quantity,
          itemData.unit_price,
          itemData.vat_rate
        );
        
        const item: InvoiceItem = {
          id: generateId('item'),
          invoice_id: invoiceId,
          description: itemData.description,
          quantity: itemData.quantity,
          unit_price: itemData.unit_price,
          vat_rate: itemData.vat_rate,
          subtotal,
          vat_amount: vatAmount,
          total,
          sort_order: i,
          created_at: new Date().toISOString(),
        };
        
        items.push(item);
        
        await db
          .prepare(
            `INSERT INTO invoice_items (
              id, invoice_id, description, quantity, unit_price, vat_rate,
              subtotal, vat_amount, total, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            item.id, item.invoice_id, item.description, item.quantity,
            item.unit_price, item.vat_rate, item.subtotal, item.vat_amount,
            item.total, item.sort_order, item.created_at
          )
          .run();
      }
      
      // Recalculate totals
      const totals = calculateInvoiceTotals(items);
      updates.push('subtotal = ?', 'vat_amount = ?', 'total = ?');
      params.push(totals.subtotal, totals.vatAmount, totals.total);
    }
    
    // Apply updates
    if (updates.length > 0) {
      updates.push('updated_at = datetime(\'now\')');
      params.push(invoiceId);
      
      await db
        .prepare(
          `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`
        )
        .bind(...params)
        .run();
    }
    
    // Get updated invoice
    const updatedInvoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(invoiceId)
      .first<Invoice>();
    
    // Audit log
    await auditActions.invoice.updated(db, user.company_id, user.id, invoiceId, existingInvoice, updatedInvoice, request);
    
    // Return updated invoice
    return getInvoice(db, request, invoiceId);
  } catch (error: any) {
    console.error('Update invoice error:', error);
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
