// Email Service with queue, retries, and delivery tracking

import type { D1Database } from '@cloudflare/workers-types';
import type { EmailLog, EmailStatus, Invoice, Customer, Company } from '../types';
import { generateId } from '../utils/id';

export interface SendEmailOptions {
  invoice: Invoice;
  customer: Customer;
  company: Company;
  recipientEmail?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface EmailProvider {
  send(params: {
    from: string;
    replyTo: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      url: string;
    }>;
  }): Promise<{
    messageId: string;
    status: 'sent' | 'queued' | 'failed';
  }>;
}

/**
 * Queue email for delivery
 */
export async function queueEmail(
  db: D1Database,
  options: SendEmailOptions
): Promise<EmailLog> {
  const { invoice, customer, company, recipientEmail, subject, bodyHtml, bodyText, attachmentUrl, attachmentName } = options;
  
  const companySettings = typeof company.settings === 'string'
    ? JSON.parse(company.settings)
    : company.settings || {};
  
  const fromEmail = companySettings.email_from || 'no-reply@domain.com';
  const replyToEmail = companySettings.email_reply_to || 'support@domain.com';
  
  // Generate email content if not provided
  const emailSubject = subject || generateEmailSubject(invoice, company);
  const emailBodyHtml = bodyHtml || generateEmailBodyHtml(invoice, customer, company);
  const emailBodyText = bodyText || generateEmailBodyText(invoice, customer, company);
  
  const emailLog: EmailLog = {
    id: generateId('email'),
    invoice_id: invoice.id,
    recipient_email: recipientEmail || customer.email,
    subject: emailSubject,
    body: emailBodyHtml,
    from_email: fromEmail,
    reply_to_email: replyToEmail,
    status: 'queued',
    retry_count: 0,
    max_retries: 3,
    metadata: {
      attachmentUrl,
      attachmentName,
      bodyText: emailBodyText,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Insert into database
  await db
    .prepare(
      `INSERT INTO email_logs (
        id, invoice_id, recipient_email, subject, body,
        from_email, reply_to_email, status, retry_count, max_retries,
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      emailLog.id,
      emailLog.invoice_id,
      emailLog.recipient_email,
      emailLog.subject,
      emailLog.body,
      emailLog.from_email,
      emailLog.reply_to_email,
      emailLog.status,
      emailLog.retry_count,
      emailLog.max_retries,
      JSON.stringify(emailLog.metadata),
      emailLog.created_at,
      emailLog.updated_at
    )
    .run();
  
  return emailLog;
}

/**
 * Process email queue and send emails
 */
export async function processEmailQueue(
  db: D1Database,
  emailProvider: EmailProvider,
  limit: number = 10
): Promise<void> {
  // Get queued or failed emails ready for retry
  const emailsToSend = await db
    .prepare(
      `SELECT * FROM email_logs 
       WHERE status IN ('queued', 'failed') 
       AND retry_count < max_retries
       AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
       LIMIT ?`
    )
    .bind(limit)
    .all<EmailLog>();
  
  if (!emailsToSend.results || emailsToSend.results.length === 0) {
    return;
  }
  
  for (const email of emailsToSend.results) {
    await sendEmail(db, emailProvider, email);
  }
}

/**
 * Send individual email
 */
async function sendEmail(
  db: D1Database,
  emailProvider: EmailProvider,
  emailLog: EmailLog
): Promise<void> {
  try {
    // Update status to sending
    await updateEmailStatus(db, emailLog.id, 'sending');
    
    const metadata = typeof emailLog.metadata === 'string'
      ? JSON.parse(emailLog.metadata)
      : emailLog.metadata || {};
    
    // Send email via provider
    const result = await emailProvider.send({
      from: emailLog.from_email,
      replyTo: emailLog.reply_to_email,
      to: emailLog.recipient_email,
      subject: emailLog.subject,
      html: emailLog.body,
      text: metadata.bodyText,
      attachments: metadata.attachmentUrl ? [{
        filename: metadata.attachmentName || 'invoice.pdf',
        url: metadata.attachmentUrl,
      }] : undefined,
    });
    
    // Update status based on result
    if (result.status === 'sent') {
      await db
        .prepare(
          `UPDATE email_logs 
           SET status = 'sent', sent_at = datetime('now'), 
               provider_message_id = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(result.messageId, emailLog.id)
        .run();
    } else if (result.status === 'queued') {
      await updateEmailStatus(db, emailLog.id, 'queued');
    } else {
      throw new Error('Email send failed');
    }
  } catch (error: any) {
    // Handle failure and schedule retry
    const retryCount = emailLog.retry_count + 1;
    const maxRetries = emailLog.max_retries;
    
    if (retryCount < maxRetries) {
      // Exponential backoff: 5min, 30min, 2h
      const retryDelays = [5, 30, 120]; // minutes
      const delayMinutes = retryDelays[retryCount - 1] || 120;
      const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      await db
        .prepare(
          `UPDATE email_logs 
           SET status = 'failed', retry_count = ?, 
               next_retry_at = ?, error_message = ?,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(
          retryCount,
          nextRetry.toISOString(),
          error.message || 'Unknown error',
          emailLog.id
        )
        .run();
    } else {
      // Max retries reached
      await db
        .prepare(
          `UPDATE email_logs 
           SET status = 'failed', retry_count = ?,
               failed_at = datetime('now'),
               error_message = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(
          retryCount,
          error.message || 'Max retries exceeded',
          emailLog.id
        )
        .run();
    }
  }
}

/**
 * Update email status
 */
async function updateEmailStatus(
  db: D1Database,
  emailId: string,
  status: EmailStatus
): Promise<void> {
  await db
    .prepare(
      `UPDATE email_logs 
       SET status = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(status, emailId)
    .run();
}

/**
 * Handle email bounce
 */
export async function handleEmailBounce(
  db: D1Database,
  providerMessageId: string,
  bounceReason: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE email_logs 
       SET status = 'bounced', bounced_at = datetime('now'),
           error_message = ?, updated_at = datetime('now')
       WHERE provider_message_id = ?`
    )
    .bind(bounceReason, providerMessageId)
    .run();
}

/**
 * Generate default email subject
 */
function generateEmailSubject(invoice: Invoice, company: Company): string {
  if (invoice.invoice_type === 'credit_note') {
    return `Credit Note ${invoice.invoice_number} from ${company.name}`;
  }
  return `Invoice ${invoice.invoice_number} from ${company.name}`;
}

/**
 * Generate default email body HTML
 */
function generateEmailBodyHtml(
  invoice: Invoice,
  customer: Customer,
  company: Company
): string {
  const viewLink = invoice.pdf_url || '#';
  
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
    .header {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
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
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>${invoice.invoice_type === 'credit_note' ? 'Credit Note' : 'Invoice'} from ${company.name}</h2>
  </div>
  
  <p>Dear ${customer.name},</p>
  
  <p>
    ${invoice.invoice_type === 'credit_note' 
      ? `Please find attached your credit note ${invoice.invoice_number}.`
      : `Please find attached your invoice ${invoice.invoice_number}.`
    }
  </p>
  
  <div class="invoice-details">
    <strong>${invoice.invoice_type === 'credit_note' ? 'Credit Note' : 'Invoice'} Number:</strong> ${invoice.invoice_number}<br>
    <strong>Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}<br>
    ${invoice.invoice_type !== 'credit_note' ? `<strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}<br>` : ''}
    <strong>Amount:</strong> ${formatCurrency(invoice.total, invoice.currency)}
  </div>
  
  ${invoice.payment_link && invoice.status !== 'paid' ? `
    <p>
      <a href="${invoice.payment_link}" class="button">Pay Now</a>
    </p>
  ` : ''}
  
  <p>
    <a href="${viewLink}" class="button">View ${invoice.invoice_type === 'credit_note' ? 'Credit Note' : 'Invoice'}</a>
  </p>
  
  ${invoice.notes ? `<p>${invoice.notes.replace(/\n/g, '<br>')}</p>` : ''}
  
  <p>
    If you have any questions, please don't hesitate to contact us.
  </p>
  
  <div class="footer">
    <p>
      ${company.name}<br>
      ${company.email}<br>
      ${company.address || ''} ${company.city || ''} ${company.postal_code || ''}
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate default email body text
 */
function generateEmailBodyText(
  invoice: Invoice,
  customer: Customer,
  company: Company
): string {
  return `
${invoice.invoice_type === 'credit_note' ? 'Credit Note' : 'Invoice'} from ${company.name}

Dear ${customer.name},

Please find attached your ${invoice.invoice_type === 'credit_note' ? 'credit note' : 'invoice'} ${invoice.invoice_number}.

${invoice.invoice_type === 'credit_note' ? 'Credit Note' : 'Invoice'} Number: ${invoice.invoice_number}
Date: ${new Date(invoice.issue_date).toLocaleDateString()}
${invoice.invoice_type !== 'credit_note' ? `Due Date: ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
Amount: ${formatCurrency(invoice.total, invoice.currency)}

${invoice.payment_link && invoice.status !== 'paid' ? `Pay online: ${invoice.payment_link}` : ''}

${invoice.notes || ''}

If you have any questions, please don't hesitate to contact us.

${company.name}
${company.email}
${company.address || ''} ${company.city || ''} ${company.postal_code || ''}
  `.trim();
}

/**
 * Simple currency formatter
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
