import { db } from '../db';
import { EmailLog, Invoice, Tenant } from '../types';
import { generateId, now } from '../utils/common';

export const emailService = {
  sendInvoice: async (invoice: Invoice, tenant: Tenant, recipientEmail: string, pdfUrl: string) => {
    // Log the attempt
    const logId = generateId();
    const log: EmailLog = {
      id: logId,
      invoiceId: invoice.id,
      tenantId: tenant.id,
      recipient: recipientEmail,
      subject: `Invoice ${invoice.number} from ${tenant.name}`,
      status: 'QUEUED',
      attempts: 0,
      createdAt: now(),
    };
    
    await db.emailLogs.create(log);
    
    // Simulate async sending (in a worker, this might be offloaded to a queue)
    // Here we just await it for simplicity or fire-and-forget
    await processEmail(log, pdfUrl, tenant);
    
    return log;
  }
};

async function processEmail(log: EmailLog, pdfUrl: string, tenant: Tenant) {
    // Update to SENDING
    log.status = 'SENDING';
    log.attempts++;
    log.lastAttemptAt = now();
    
    // Simulate network delay
    // await new Promise(r => setTimeout(r, 100));
    
    // Simulate success/failure
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
        log.status = 'SENT';
    } else {
        log.status = 'FAILED';
        log.error = 'Simulated SMTP error';
    }
    
    // Update log in DB (mock)
    // db.emailLogs.update(log.id, log); // we'd need an update method
}
