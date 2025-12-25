// Email service with queue and retry logic

import type { Invoice, EmailLog, EmailStatus } from './types';
import { Database } from './db';

export class EmailService {
	constructor(
		private db: Database,
		private queue: Queue,
		private fromEmail: string,
		private replyToEmail: string,
		private domain: string
	) {}

	async queueInvoiceEmail(
		invoice: Invoice,
		toEmail: string,
		subject?: string,
		message?: string,
		viewToken?: string
	): Promise<EmailLog> {
		const emailSubject = subject || `Invoice ${invoice.invoice_number} from ${invoice.company_id}`;
		const viewLink = viewToken ? `https://${this.domain}/invoice-view/${viewToken}` : null;

		// Create email log
		const emailLog = await this.db.createEmailLog({
			invoice_id: invoice.id,
			to_email: toEmail,
			subject: emailSubject,
			status: 'queued',
			retry_count: 0,
			max_retries: 3,
		});

		// Queue email for sending
		await this.queue.send({
			emailLogId: emailLog.id,
			invoiceId: invoice.id,
			toEmail,
			subject: emailSubject,
			message: message || this.generateDefaultMessage(invoice, viewLink),
			viewLink,
		});

		return emailLog;
	}

	async sendEmail(message: QueueMessage<EmailQueueMessage>): Promise<void> {
		const { emailLogId, invoiceId, toEmail, subject, message: body, viewLink } = message.body;

		// Update status to sending
		await this.db.updateEmailLog(emailLogId, { status: 'sending' });

		try {
			// Send email using Cloudflare Email Workers or external service
			// For Cloudflare, you'd use Email Workers API
			// For now, we'll simulate with fetch to an email service
			await this.deliverEmail({
				to: toEmail,
				from: this.fromEmail,
				replyTo: this.replyToEmail,
				subject,
				html: body,
			});

			// Mark as sent
			await this.db.updateEmailLog(emailLogId, {
				status: 'sent',
				sent_at: Math.floor(Date.now() / 1000),
			});
		} catch (error: any) {
			const emailLog = await this.db.getEmailLog(emailLogId);
			if (!emailLog) return;

			const retryCount = emailLog.retry_count + 1;
			const errorMessage = error.message || 'Unknown error';

			if (retryCount >= emailLog.max_retries) {
				// Max retries reached - mark as failed
				await this.db.updateEmailLog(emailLogId, {
					status: 'failed',
					retry_count: retryCount,
					error_message: errorMessage,
					failed_at: Math.floor(Date.now() / 1000),
				});
			} else {
				// Retry later
				await this.db.updateEmailLog(emailLogId, {
					status: 'queued',
					retry_count: retryCount,
					error_message: errorMessage,
				});

				// Re-queue with exponential backoff
				const delay = Math.min(1000 * Math.pow(2, retryCount), 3600000); // Max 1 hour
				await this.queue.send(message.body, { delaySeconds: Math.floor(delay / 1000) });
			}
		}
	}

	private async deliverEmail(params: {
		to: string;
		from: string;
		replyTo: string;
		subject: string;
		html: string;
	}): Promise<void> {
		// In production, use Cloudflare Email Workers or a service like SendGrid, Mailgun, etc.
		// For Cloudflare Email Workers:
		// const response = await fetch('https://api.cloudflare.com/client/v4/accounts/{account_id}/email/routing/addresses/{address_id}/send', {
		//   method: 'POST',
		//   headers: {
		//     'Authorization': `Bearer ${apiToken}`,
		//     'Content-Type': 'application/json',
		//   },
		//   body: JSON.stringify({
		//     to: params.to,
		//     from: params.from,
		//     replyTo: params.replyTo,
		//     subject: params.subject,
		//     html: params.html,
		//   }),
		// });

		// For now, simulate email sending
		// In production, replace with actual email API call
		console.log('Sending email:', {
			to: params.to,
			from: params.from,
			replyTo: params.replyTo,
			subject: params.subject,
		});

		// Simulate potential failures
		if (Math.random() < 0.1) {
			throw new Error('Simulated email delivery failure');
		}
	}

	private generateDefaultMessage(invoice: Invoice, viewLink: string | null): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
		.button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
		.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h2>Invoice ${invoice.invoice_number}</h2>
		</div>
		
		<p>Dear Customer,</p>
		
		<p>Please find attached invoice <strong>${invoice.invoice_number}</strong> for your records.</p>
		
		<p><strong>Invoice Details:</strong></p>
		<ul>
			<li>Invoice Number: ${invoice.invoice_number}</li>
			<li>Date: ${new Date(invoice.invoice_date * 1000).toLocaleDateString()}</li>
			<li>Due Date: ${new Date(invoice.due_date * 1000).toLocaleDateString()}</li>
			<li>Total Amount: ${invoice.currency} ${invoice.total.toFixed(2)}</li>
		</ul>
		
		${viewLink ? `
			<p>You can view and download the invoice online:</p>
			<a href="${viewLink}" class="button">View Invoice</a>
		` : ''}
		
		${invoice.payment_link ? `
			<p>To pay this invoice, please use the following link:</p>
			<a href="${invoice.payment_link}" class="button" style="background-color: #28a745;">Pay Now</a>
		` : ''}
		
		<p>If you have any questions, please reply to this email.</p>
		
		<div class="footer">
			<p>This is an automated message. Please do not reply directly to this email.</p>
			<p>For support, contact: ${this.replyToEmail}</p>
		</div>
	</div>
</body>
</html>
		`;
	}

	async handleBounce(emailLogId: string): Promise<void> {
		await this.db.updateEmailLog(emailLogId, {
			status: 'bounced',
			bounced_at: Math.floor(Date.now() / 1000),
		});
	}
}

interface EmailQueueMessage {
	emailLogId: string;
	invoiceId: string;
	toEmail: string;
	subject: string;
	message: string;
	viewLink?: string;
}
