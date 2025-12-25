// Automated reminder service

import type { D1Database } from '@cloudflare/workers-types';
import type { Invoice, Customer, Company, ReminderSettings, ReminderLog } from '../types';
import { generateId } from '../utils/id';
import { daysToDue } from '../utils/calculations';
import { queueEmail, type EmailProvider } from './email-service';

/**
 * Process reminders for all overdue/upcoming invoices
 */
export async function processReminders(
  db: D1Database,
  emailProvider: EmailProvider
): Promise<void> {
  // Get all unpaid invoices that might need reminders
  const invoices = await db
    .prepare(
      `SELECT i.*, c.name as customer_name, c.email as customer_email,
              c.reminder_settings as customer_reminder_settings,
              co.name as company_name, co.settings as company_settings
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN companies co ON i.company_id = co.id
       WHERE i.status IN ('sent', 'payment_pending', 'overdue')
       AND i.invoice_type = 'invoice'`
    )
    .all<Invoice & { 
      customer_name: string; 
      customer_email: string;
      customer_reminder_settings: string;
      company_name: string;
      company_settings: string;
    }>();
  
  if (!invoices.results || invoices.results.length === 0) {
    return;
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  for (const invoice of invoices.results) {
    // Check if reminder should be sent
    const shouldSend = await shouldSendReminder(db, invoice, now);
    
    if (shouldSend.send) {
      await sendReminder(db, emailProvider, invoice, shouldSend.type!, shouldSend.daysOffset!);
    }
  }
}

/**
 * Check if a reminder should be sent for an invoice
 */
async function shouldSendReminder(
  db: D1Database,
  invoice: Invoice & { customer_reminder_settings: string; company_settings: string },
  now: Date
): Promise<{
  send: boolean;
  type?: 'before_due' | 'on_due' | 'overdue';
  daysOffset?: number;
}> {
  // Get reminder settings (invoice > customer > company)
  let reminderSettings: ReminderSettings | undefined;
  
  if (invoice.reminder_settings) {
    reminderSettings = typeof invoice.reminder_settings === 'string'
      ? JSON.parse(invoice.reminder_settings)
      : invoice.reminder_settings;
  } else if (invoice.customer_reminder_settings) {
    reminderSettings = JSON.parse(invoice.customer_reminder_settings);
  } else if (invoice.company_settings) {
    const companySettings = JSON.parse(invoice.company_settings);
    if (companySettings.reminder_enabled) {
      reminderSettings = {
        enabled: true,
        days_before: companySettings.reminder_days_before || [7, 3, 1],
        days_after: companySettings.reminder_days_after || [1, 7, 14],
      };
    }
  }
  
  if (!reminderSettings || !reminderSettings.enabled) {
    return { send: false };
  }
  
  const days = daysToDue(invoice.due_date);
  
  // Check which reminder to send
  let reminderType: 'before_due' | 'on_due' | 'overdue' | undefined;
  let daysOffset: number | undefined;
  
  if (days > 0 && reminderSettings.days_before) {
    // Before due date
    for (const daysBefore of reminderSettings.days_before) {
      if (days === daysBefore) {
        reminderType = 'before_due';
        daysOffset = -daysBefore;
        break;
      }
    }
  } else if (days === 0) {
    // On due date
    reminderType = 'on_due';
    daysOffset = 0;
  } else if (days < 0 && reminderSettings.days_after) {
    // After due date (overdue)
    const daysOverdue = Math.abs(days);
    for (const daysAfter of reminderSettings.days_after) {
      if (daysOverdue === daysAfter) {
        reminderType = 'overdue';
        daysOffset = daysAfter;
        break;
      }
    }
  }
  
  if (!reminderType) {
    return { send: false };
  }
  
  // Check if reminder was already sent for this type and offset
  const existingReminder = await db
    .prepare(
      `SELECT id FROM reminder_logs
       WHERE invoice_id = ? AND reminder_type = ? AND days_offset = ?`
    )
    .bind(invoice.id, reminderType, daysOffset)
    .first();
  
  if (existingReminder) {
    return { send: false };
  }
  
  return { send: true, type: reminderType, daysOffset };
}

/**
 * Send a reminder email
 */
async function sendReminder(
  db: D1Database,
  emailProvider: EmailProvider,
  invoice: Invoice & { customer_name: string; customer_email: string; company_name: string; company_settings: string },
  reminderType: 'before_due' | 'on_due' | 'overdue',
  daysOffset: number
): Promise<void> {
  // Get customer and company details
  const customer = await db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .bind(invoice.customer_id)
    .first<Customer>();
  
  const company = await db
    .prepare('SELECT * FROM companies WHERE id = ?')
    .bind(invoice.company_id)
    .first<Company>();
  
  if (!customer || !company) {
    console.error('Customer or company not found for reminder');
    return;
  }
  
  // Generate reminder email
  const subject = generateReminderSubject(invoice, reminderType, daysOffset, company);
  const bodyHtml = generateReminderBodyHtml(invoice, customer, company, reminderType, daysOffset);
  const bodyText = generateReminderBodyText(invoice, customer, company, reminderType, daysOffset);
  
  // Queue email
  const emailLog = await queueEmail(db, {
    invoice,
    customer,
    company,
    subject,
    bodyHtml,
    bodyText,
    attachmentUrl: invoice.pdf_url,
    attachmentName: `invoice-${invoice.invoice_number}.pdf`,
  });
  
  // Log reminder
  const reminderLog: ReminderLog = {
    id: generateId('reminder'),
    invoice_id: invoice.id,
    email_log_id: emailLog.id,
    reminder_type: reminderType,
    days_offset: daysOffset,
    sent_at: new Date().toISOString(),
    status: 'sent',
  };
  
  await db
    .prepare(
      `INSERT INTO reminder_logs (id, invoice_id, email_log_id, reminder_type, days_offset, sent_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      reminderLog.id,
      reminderLog.invoice_id,
      reminderLog.email_log_id,
      reminderLog.reminder_type,
      reminderLog.days_offset,
      reminderLog.sent_at,
      reminderLog.status
    )
    .run();
  
  // Update invoice reminder count and timestamp
  await db
    .prepare(
      `UPDATE invoices 
       SET reminder_count = reminder_count + 1,
           last_reminder_sent_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(invoice.id)
    .run();
  
  // Update invoice status to overdue if past due
  if (reminderType === 'overdue' && invoice.status === 'sent') {
    await db
      .prepare(
        `UPDATE invoices 
         SET status = 'overdue', updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(invoice.id)
      .run();
  }
}

/**
 * Generate reminder email subject
 */
function generateReminderSubject(
  invoice: Invoice,
  reminderType: 'before_due' | 'on_due' | 'overdue',
  daysOffset: number,
  company: Company
): string {
  if (reminderType === 'before_due') {
    return `Reminder: Invoice ${invoice.invoice_number} due in ${Math.abs(daysOffset)} day${Math.abs(daysOffset) !== 1 ? 's' : ''} - ${company.name}`;
  } else if (reminderType === 'on_due') {
    return `Reminder: Invoice ${invoice.invoice_number} due today - ${company.name}`;
  } else {
    return `Overdue: Invoice ${invoice.invoice_number} past due by ${daysOffset} day${daysOffset !== 1 ? 's' : ''} - ${company.name}`;
  }
}

/**
 * Generate reminder email HTML body
 */
function generateReminderBodyHtml(
  invoice: Invoice,
  customer: Customer,
  company: Company,
  reminderType: 'before_due' | 'on_due' | 'overdue',
  daysOffset: number
): string {
  const urgencyColor = reminderType === 'overdue' ? '#dc3545' : reminderType === 'on_due' ? '#ffc107' : '#007bff';
  
  let reminderMessage = '';
  if (reminderType === 'before_due') {
    reminderMessage = `This is a friendly reminder that invoice ${invoice.invoice_number} is due in ${Math.abs(daysOffset)} day${Math.abs(daysOffset) !== 1 ? 's' : ''}.`;
  } else if (reminderType === 'on_due') {
    reminderMessage = `This is a reminder that invoice ${invoice.invoice_number} is due today.`;
  } else {
    reminderMessage = `This invoice is now ${daysOffset} day${daysOffset !== 1 ? 's' : ''} overdue. Please arrange payment as soon as possible.`;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .alert {
      background-color: ${urgencyColor};
      color: white;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      text-align: center;
      font-weight: bold;
    }
    .invoice-details {
      background-color: #fff;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="alert">
    ${reminderType === 'overdue' ? '⚠️ OVERDUE INVOICE' : reminderType === 'on_due' ? '⏰ INVOICE DUE TODAY' : '📅 UPCOMING INVOICE'}
  </div>
  
  <p>Dear ${customer.name},</p>
  
  <p>${reminderMessage}</p>
  
  <div class="invoice-details">
    <strong>Invoice Number:</strong> ${invoice.invoice_number}<br>
    <strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}<br>
    <strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}<br>
    <strong>Amount Due:</strong> ${formatCurrency(invoice.total - invoice.paid_amount, invoice.currency)}
  </div>
  
  ${invoice.payment_link ? `
    <p>
      <a href="${invoice.payment_link}" class="button">Pay Now</a>
    </p>
  ` : ''}
  
  <p>
    If you have already made this payment, please disregard this reminder.
  </p>
  
  <p>
    If you have any questions or concerns, please contact us at ${company.email}.
  </p>
  
  <p>
    Best regards,<br>
    ${company.name}
  </p>
</body>
</html>
  `;
}

/**
 * Generate reminder email text body
 */
function generateReminderBodyText(
  invoice: Invoice,
  customer: Customer,
  company: Company,
  reminderType: 'before_due' | 'on_due' | 'overdue',
  daysOffset: number
): string {
  let reminderMessage = '';
  if (reminderType === 'before_due') {
    reminderMessage = `This is a friendly reminder that invoice ${invoice.invoice_number} is due in ${Math.abs(daysOffset)} day${Math.abs(daysOffset) !== 1 ? 's' : ''}.`;
  } else if (reminderType === 'on_due') {
    reminderMessage = `This is a reminder that invoice ${invoice.invoice_number} is due today.`;
  } else {
    reminderMessage = `This invoice is now ${daysOffset} day${daysOffset !== 1 ? 's' : ''} overdue. Please arrange payment as soon as possible.`;
  }
  
  return `
${reminderType === 'overdue' ? 'OVERDUE INVOICE' : reminderType === 'on_due' ? 'INVOICE DUE TODAY' : 'UPCOMING INVOICE'}

Dear ${customer.name},

${reminderMessage}

Invoice Number: ${invoice.invoice_number}
Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Amount Due: ${formatCurrency(invoice.total - invoice.paid_amount, invoice.currency)}

${invoice.payment_link ? `Pay online: ${invoice.payment_link}` : ''}

If you have already made this payment, please disregard this reminder.

If you have any questions or concerns, please contact us at ${company.email}.

Best regards,
${company.name}
  `.trim();
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
