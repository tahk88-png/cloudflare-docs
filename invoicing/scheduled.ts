// Scheduled tasks: process reminders, check overdue invoices

import type { Env } from './types';
import { Database } from './db';
import { EmailService } from './email';
import { AccountingService } from './accounting';

export async function scheduledHandler(env: Env) {
	const db = new Database(env.DB);
	const emailService = new EmailService(
		db,
		env.QUEUE,
		env.EMAIL_FROM,
		env.EMAIL_REPLY_TO,
		env.DOMAIN
	);

	// Process pending reminders
	await processReminders(db, emailService);

	// Check for overdue invoices
	await checkOverdueInvoices(db);
}

async function processReminders(db: Database, emailService: EmailService) {
	const reminders = await db.getPendingReminders(100);

	for (const reminder of reminders) {
		const invoice = await db.getInvoice(reminder.invoice_id);
		if (!invoice) continue;

		const customer = await db.getCustomer(invoice.customer_id);
		if (!customer || !customer.email) continue;

		// Check if reminders are enabled for this customer
		if (!customer.reminder_enabled) {
			await db.markReminderSent(reminder.id, '');
			continue;
		}

		try {
			// Queue reminder email
			const emailLog = await emailService.queueInvoiceEmail(
				invoice,
				customer.email,
				`Reminder: Invoice ${invoice.invoice_number} is ${reminder.reminder_type === 'overdue' ? 'overdue' : 'due soon'}`,
				undefined,
				undefined // Could generate a new view token if needed
			);

			await db.markReminderSent(reminder.id, emailLog.id);
		} catch (error) {
			console.error('Failed to send reminder:', error);
		}
	}
}

async function checkOverdueInvoices(db: Database) {
	// Get all sent invoices
	const invoices = await db.getInvoicesByStatus('sent', 1000);

	for (const invoice of invoices) {
		if (AccountingService.isOverdue(invoice.due_date)) {
			// Update status to overdue
			await db.updateInvoice(invoice.id, { status: 'overdue' });

			// Create reminder if customer has reminders enabled
			const customer = await db.getCustomer(invoice.customer_id);
			if (customer && customer.reminder_enabled) {
				const reminderDays = customer.reminder_days || 7;
				const scheduledFor = invoice.due_date + (reminderDays * 24 * 60 * 60);

				// Check if reminder already exists
				const existingReminders = await db.getPendingReminders(1000);
				const hasReminder = existingReminders.some(r => r.invoice_id === invoice.id);

				if (!hasReminder) {
					await db.createReminder({
						invoice_id: invoice.id,
						reminder_type: 'overdue',
						scheduled_for: scheduledFor,
					});
				}
			}
		}
	}
}
