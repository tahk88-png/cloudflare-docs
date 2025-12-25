import { db } from '../db';
import { Invoice, InvoiceItem, InvoiceStatus, Tenant, User } from '../types';
import { generateId, now } from '../utils/common';
import { pdfService } from './pdf';
import { auditService } from './audit';
import { emailService } from './email';

export const invoiceService = {
  create: async (
    tenantId: string,
    userId: string,
    data: {
      customerId: string;
      items: InvoiceItem[];
      dueDate: string;
      notes?: string;
    }
  ) => {
    const tenant = await db.tenants.get(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const vatTotal = data.items.reduce((sum, item) => sum + (item.amount * item.vatRate / 100), 0);
    const total = subtotal + vatTotal;

    // Generate number
    const year = new Date().getFullYear();
    const yearPrefix = `${year}-`;
    const lastNumber = await db.invoices.findLatestNumber(tenantId, yearPrefix);
    
    let nextSeq = 1;
    if (lastNumber) {
        const parts = lastNumber.split('-');
        if (parts.length === 2) {
            nextSeq = parseInt(parts[1], 10) + 1;
        }
    }
    
    const number = `${yearPrefix}${nextSeq.toString().padStart(6, '0')}`;

    const invoice: Invoice = {
      id: generateId(),
      tenantId,
      customerId: data.customerId,
      number,
      issueDate: now(),
      dueDate: data.dueDate,
      status: 'DRAFT',
      items: data.items,
      subtotal,
      vatTotal,
      total,
      currency: tenant.invoiceSettings.currency,
      notes: data.notes,
      createdAt: now(),
      updatedAt: now(),
      createdBy: userId,
    };

    await db.invoices.create(invoice);
    await auditService.log(tenantId, userId, 'CREATE_INVOICE', 'INVOICE', invoice.id, { number });

    return invoice;
  },

  update: async (
    invoiceId: string,
    tenantId: string,
    userId: string,
    data: Partial<Invoice>
  ) => {
      const invoice = await db.invoices.get(invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.tenantId !== tenantId) throw new Error('Unauthorized');
      if (invoice.status !== 'DRAFT') throw new Error('Cannot edit finalized invoice');

      // Recalculate totals if items changed
      let updates = { ...data, updatedAt: now() };
      
      if (data.items) {
          const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
          const vatTotal = data.items.reduce((sum, item) => sum + (item.amount * item.vatRate / 100), 0);
          const total = subtotal + vatTotal;
          updates = { ...updates, subtotal, vatTotal, total };
      }

      const updated = await db.invoices.update(invoiceId, updates);
      await auditService.log(tenantId, userId, 'UPDATE_INVOICE', 'INVOICE', invoiceId);
      return updated;
  },

  finalizeAndSend: async (invoiceId: string, tenantId: string, userId: string) => {
      const invoice = await db.invoices.get(invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.tenantId !== tenantId) throw new Error('Unauthorized');
      
      const tenant = await db.tenants.get(tenantId);
      if (!tenant) throw new Error('Tenant not found');

      const customer = await db.customers.get(invoice.customerId);
      if (!customer) throw new Error('Customer not found');

      // Generate Final PDF
      const pdfData = await pdfService.generate(invoice, tenant, customer, false);
      const pdfUrl = await pdfService.store(invoice.id, pdfData.buffer);

      // Update Invoice
      const updated = await db.invoices.update(invoiceId, {
          status: 'SENT',
          pdfUrl,
          pdfSha256: pdfData.hash,
          sentAt: now(),
          updatedAt: now()
      });

      // Send Email
      await emailService.sendInvoice(updated, tenant, customer.email, pdfUrl);
      
      await auditService.log(tenantId, userId, 'SEND_INVOICE', 'INVOICE', invoiceId);
      
      return updated;
  },

  generateViewToken: async (invoiceId: string, tenantId: string, userId: string) => {
      const invoice = await db.invoices.get(invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.tenantId !== tenantId) throw new Error('Unauthorized');

      const tokenStr = generateId(); // simple uuid as token
      // valid for 30 days
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const token = {
          token: tokenStr,
          invoiceId,
          expiresAt,
          createdAt: now()
      };
      
      await db.viewTokens.create(token);
      return token;
  },
  
  getViewByToken: async (tokenStr: string, request: Request) => {
      const token = await db.viewTokens.get(tokenStr);
      if (!token) throw new Error('Invalid token');
      
      if (new Date(token.expiresAt) < new Date()) {
          throw new Error('Token expired');
      }
      
      const invoice = await db.invoices.get(token.invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      
      // Update viewedAt
      await db.invoices.update(invoice.id, { viewedAt: now() });
      
      // Log access (no user ID here, effectively anonymous/public view)
      await auditService.log(invoice.tenantId, 'system', 'VIEW_INVOICE_PUBLIC', 'INVOICE', invoice.id, { token: tokenStr }, request);
      
      return invoice;
  }
};
