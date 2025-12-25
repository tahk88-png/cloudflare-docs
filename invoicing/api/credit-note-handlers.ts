// Credit note handlers

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, InvoiceItem, Customer, Company, CreateCreditNoteRequest } from '../types';
import { generateId } from '../utils/id';
import { generateInvoiceNumber } from '../utils/invoice-number';
import { calculateLineItem, calculateInvoiceTotals, isValidVatRate } from '../utils/calculations';
import { requirePermission, requireCompanyAccess } from '../services/auth-service';
import { auditActions } from '../services/audit-service';

/**
 * POST /api/invoices/:id/credit-note - Create credit note for an invoice
 */
export async function createCreditNote(
  db: D1Database,
  r2: any,
  request: Request,
  invoiceId: string,
  body: CreateCreditNoteRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canCreateInvoice');
    
    // Get original invoice
    const originalInvoice = await db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .bind(invoiceId)
      .first<Invoice>();
    
    if (!originalInvoice) {
      return jsonError('Original invoice not found', 404);
    }
    
    // Check company access
    await requireCompanyAccess(user, originalInvoice.company_id);
    
    // Can only create credit notes for sent/paid invoices
    if (!['sent', 'paid', 'payment_pending', 'overdue'].includes(originalInvoice.status)) {
      return jsonError('Can only create credit notes for sent or paid invoices', 400);
    }
    
    // Get company details
    const company = await db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .bind(user.company_id)
      .first<Company>();
    
    if (!company) {
      return jsonError('Company not found', 404);
    }
    
    // Get customer
    const customer = await db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .bind(originalInvoice.customer_id)
      .first<Customer>();
    
    if (!customer) {
      return jsonError('Customer not found', 404);
    }
    
    // Validate items
    if (!body.items || body.items.length === 0) {
      return jsonError('At least one item is required', 400);
    }
    
    for (const item of body.items) {
      if (!isValidVatRate(item.vat_rate)) {
        return jsonError(`Invalid VAT rate: ${item.vat_rate}`, 400);
      }
    }
    
    // Generate credit note number
    const creditNoteNumber = await generateInvoiceNumber(db, user.company_id, company.invoice_prefix);
    
    // Create credit note (as negative invoice)
    const creditNoteId = generateId('cn');
    const creditNote: Invoice = {
      id: creditNoteId,
      company_id: user.company_id,
      customer_id: originalInvoice.customer_id,
      invoice_number: creditNoteNumber,
      invoice_type: 'credit_note',
      parent_invoice_id: invoiceId,
      status: 'draft',
      issue_date: new Date().toISOString(),
      due_date: new Date().toISOString(), // Credit notes don't have due dates
      currency: originalInvoice.currency,
      subtotal: 0,
      vat_amount: 0,
      total: 0,
      paid_amount: 0,
      is_pdf_final: false,
      reminder_count: 0,
      view_count: 0,
      notes: body.notes || `Credit note for invoice ${originalInvoice.invoice_number}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
    };
    
    // Calculate and create items (negative amounts)
    const items: InvoiceItem[] = [];
    for (let i = 0; i < body.items.length; i++) {
      const itemData = body.items[i];
      const { subtotal, vatAmount, total } = calculateLineItem(
        -Math.abs(itemData.quantity), // Negative for credit
        itemData.unit_price,
        itemData.vat_rate
      );
      
      const item: InvoiceItem = {
        id: generateId('item'),
        invoice_id: creditNoteId,
        description: itemData.description,
        quantity: -Math.abs(itemData.quantity),
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
    
    // Calculate credit note totals
    const totals = calculateInvoiceTotals(items);
    creditNote.subtotal = totals.subtotal;
    creditNote.vat_amount = totals.vatAmount;
    creditNote.total = totals.total;
    
    // Insert credit note
    await db
      .prepare(
        `INSERT INTO invoices (
          id, company_id, customer_id, invoice_number, invoice_type, parent_invoice_id,
          status, issue_date, due_date, currency, subtotal, vat_amount, total, paid_amount,
          is_pdf_final, reminder_count, view_count, notes,
          created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        creditNote.id, creditNote.company_id, creditNote.customer_id,
        creditNote.invoice_number, creditNote.invoice_type, creditNote.parent_invoice_id,
        creditNote.status, creditNote.issue_date, creditNote.due_date, creditNote.currency,
        creditNote.subtotal, creditNote.vat_amount, creditNote.total, creditNote.paid_amount,
        creditNote.is_pdf_final ? 1 : 0, creditNote.reminder_count, creditNote.view_count,
        creditNote.notes, creditNote.created_at, creditNote.updated_at, creditNote.created_by
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
    
    // Update original invoice paid amount (reduce by credit note amount)
    const creditAmount = Math.abs(creditNote.total);
    const newPaidAmount = Math.max(0, originalInvoice.paid_amount - creditAmount);
    
    let newStatus = originalInvoice.status;
    if (newPaidAmount === 0 && originalInvoice.status === 'paid') {
      newStatus = 'sent'; // Revert to sent if fully credited
    }
    
    await db
      .prepare(
        `UPDATE invoices 
         SET paid_amount = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(newPaidAmount, newStatus, invoiceId)
      .run();
    
    // Audit log
    await auditActions.invoice.created(
      db,
      user.company_id,
      user.id,
      creditNote.id,
      creditNote,
      request
    );
    
    return jsonResponse({
      credit_note: creditNote,
      items,
      customer,
      company,
      original_invoice: originalInvoice,
    }, 201);
  } catch (error: any) {
    console.error('Create credit note error:', error);
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
