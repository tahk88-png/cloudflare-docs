import { db } from '../db';
import { emailService } from './email';
import { auditService } from './audit';
import { now } from '../utils/common';

export const reminderService = {
  processReminders: async () => {
    // In a real DB, we would query: status = 'SENT' AND dueDate < now AND (lastReminderAt is null OR lastReminderAt < 3 days ago)
    const allInvoices = await db.invoices.listByTenant('default-tenant'); // iterating all for mock
    
    const overdueInvoices = allInvoices.filter(inv => {
        if (inv.status !== 'SENT' && inv.status !== 'OVERDUE') return false;
        const dueDate = new Date(inv.dueDate);
        const today = new Date();
        return dueDate < today;
    });

    for (const invoice of overdueInvoices) {
        // Mock check if we already sent a reminder today
        // This logic would be more complex in production
        
        const tenant = await db.tenants.get(invoice.tenantId);
        const customer = await db.customers.get(invoice.customerId);
        
        if (tenant && customer) {
            console.log(`Sending reminder for invoice ${invoice.number}`);
            await emailService.sendInvoice(invoice, tenant, customer.email, invoice.pdfUrl || '');
            
            await auditService.log(tenant.id, 'system', 'SEND_REMINDER', 'INVOICE', invoice.id);
            
            // Update status to OVERDUE if not already
            if (invoice.status !== 'OVERDUE') {
                await db.invoices.update(invoice.id, { status: 'OVERDUE' });
            }
        }
    }
  }
};
