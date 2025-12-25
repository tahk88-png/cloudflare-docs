// Database helper functions

import type {
	Invoice,
	InvoiceItem,
	Customer,
	Company,
	User,
	EmailLog,
	InvoiceViewToken,
	CreditNote,
	AuditLog,
	InvoiceReminder,
	Template,
} from './types';

export class Database {
	constructor(private db: D1Database) {}

	// Invoice operations
	async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		
		await this.db.prepare(`
			INSERT INTO invoices (
				id, company_id, invoice_number, customer_id, status,
				invoice_date, due_date, currency, vat_rate,
				subtotal, vat_amount, total, notes, payment_link,
				pdf_url, pdf_sha256, pdf_mode, sent_at, paid_at,
				created_by, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			invoice.company_id,
			invoice.invoice_number,
			invoice.customer_id,
			invoice.status,
			invoice.invoice_date,
			invoice.due_date,
			invoice.currency,
			invoice.vat_rate,
			invoice.subtotal,
			invoice.vat_amount,
			invoice.total,
			invoice.notes || null,
			invoice.payment_link || null,
			invoice.pdf_url || null,
			invoice.pdf_sha256 || null,
			invoice.pdf_mode || null,
			invoice.sent_at || null,
			invoice.paid_at || null,
			invoice.created_by,
			now,
			now
		).run();

		return this.getInvoice(id);
	}

	async getInvoice(id: string): Promise<Invoice | null> {
		const result = await this.db.prepare(`
			SELECT * FROM invoices WHERE id = ?
		`).bind(id).first<Invoice>();

		if (!result) return null;

		// Load items
		const items = await this.db.prepare(`
			SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, created_at
		`).bind(id).all<InvoiceItem>();

		return {
			...result,
			items: items.results || [],
		};
	}

	async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
		const allowedFields = [
			'customer_id', 'invoice_date', 'due_date', 'currency', 'vat_rate',
			'subtotal', 'vat_amount', 'total', 'notes', 'payment_link',
			'pdf_url', 'pdf_sha256', 'pdf_mode', 'status', 'sent_at', 'paid_at'
		];
		
		const setClause: string[] = [];
		const values: any[] = [];

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key) && value !== undefined) {
				setClause.push(`${key} = ?`);
				values.push(value);
			}
		}

		if (setClause.length === 0) {
			return this.getInvoice(id)!;
		}

		setClause.push('updated_at = ?');
		values.push(Math.floor(Date.now() / 1000));
		values.push(id);

		await this.db.prepare(`
			UPDATE invoices SET ${setClause.join(', ')} WHERE id = ?
		`).bind(...values).run();

		return this.getInvoice(id)!;
	}

	async getInvoicesByCompany(companyId: string, limit = 100, offset = 0): Promise<Invoice[]> {
		const results = await this.db.prepare(`
			SELECT * FROM invoices 
			WHERE company_id = ? 
			ORDER BY created_at DESC 
			LIMIT ? OFFSET ?
		`).bind(companyId, limit, offset).all<Invoice>();

		const invoices = results.results || [];
		
		// Load items for each invoice
		for (const invoice of invoices) {
			const items = await this.db.prepare(`
				SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, created_at
			`).bind(invoice.id).all<InvoiceItem>();
			invoice.items = items.results || [];
		}

		return invoices;
	}

	async getInvoicesByStatus(status: string, limit = 1000): Promise<Invoice[]> {
		const results = await this.db.prepare(`
			SELECT * FROM invoices 
			WHERE status = ? 
			ORDER BY due_date ASC 
			LIMIT ?
		`).bind(status, limit).all<Invoice>();

		const invoices = results.results || [];
		
		// Load items for each invoice
		for (const invoice of invoices) {
			const items = await this.db.prepare(`
				SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, created_at
			`).bind(invoice.id).all<InvoiceItem>();
			invoice.items = items.results || [];
		}

		return invoices;
	}

	// Invoice items
	async createInvoiceItems(items: Omit<InvoiceItem, 'id' | 'created_at'>[]): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT INTO invoice_items (
				id, invoice_id, description, quantity, unit_price,
				vat_rate, line_total, line_vat, line_total_with_vat, sort_order, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const now = Math.floor(Date.now() / 1000);
		await this.db.batch(
			items.map((item, idx) =>
				stmt.bind(
					crypto.randomUUID(),
					item.invoice_id!,
					item.description,
					item.quantity,
					item.unit_price,
					item.vat_rate,
					item.line_total,
					item.line_vat,
					item.line_total_with_vat,
					item.sort_order ?? idx,
					now
				)
			)
		);
	}

	async updateInvoiceItems(invoiceId: string, items: InvoiceItem[]): Promise<void> {
		// Delete existing items
		await this.db.prepare(`
			DELETE FROM invoice_items WHERE invoice_id = ?
		`).bind(invoiceId).run();

		// Insert new items
		if (items.length > 0) {
			await this.createInvoiceItems(
				items.map(item => ({ ...item, invoice_id: invoiceId }))
			);
		}
	}

	// Invoice numbering
	async getNextInvoiceNumber(companyId: string, year: number): Promise<string> {
		const result = await this.db.prepare(`
			SELECT sequence FROM invoice_sequences 
			WHERE company_id = ? AND year = ?
		`).bind(companyId, year).first<{ sequence: number }>();

		let nextSequence: number;
		if (result) {
			nextSequence = result.sequence + 1;
			await this.db.prepare(`
				UPDATE invoice_sequences SET sequence = ? 
				WHERE company_id = ? AND year = ?
			`).bind(nextSequence, companyId, year).run();
		} else {
			nextSequence = 1;
			await this.db.prepare(`
				INSERT INTO invoice_sequences (company_id, year, sequence)
				VALUES (?, ?, ?)
			`).bind(companyId, year, nextSequence).run();
		}

		return `${year}-${String(nextSequence).padStart(6, '0')}`;
	}

	// Customer operations
	async getCustomer(id: string): Promise<Customer | null> {
		return await this.db.prepare(`
			SELECT * FROM customers WHERE id = ?
		`).bind(id).first<Customer>() || null;
	}

	async getCustomersByCompany(companyId: string): Promise<Customer[]> {
		const result = await this.db.prepare(`
			SELECT * FROM customers WHERE company_id = ? ORDER BY name
		`).bind(companyId).all<Customer>();
		return result.results || [];
	}

	// Company operations
	async getCompany(id: string): Promise<Company | null> {
		return await this.db.prepare(`
			SELECT * FROM companies WHERE id = ?
		`).bind(id).first<Company>() || null;
	}

	// User operations
	async getUser(id: string): Promise<User | null> {
		return await this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).bind(id).first<User>() || null;
	}

	async getUserByEmail(email: string, companyId: string): Promise<User | null> {
		return await this.db.prepare(`
			SELECT * FROM users WHERE email = ? AND company_id = ?
		`).bind(email, companyId).first<User>() || null;
	}

	// Email logs
	async createEmailLog(log: Omit<EmailLog, 'id' | 'created_at' | 'updated_at'>): Promise<EmailLog> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db.prepare(`
			INSERT INTO email_logs (
				id, invoice_id, to_email, subject, status,
				retry_count, max_retries, error_message,
				sent_at, bounced_at, failed_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			log.invoice_id,
			log.to_email,
			log.subject,
			log.status,
			log.retry_count,
			log.max_retries,
			log.error_message || null,
			log.sent_at || null,
			log.bounced_at || null,
			log.failed_at || null,
			now,
			now
		).run();

		return this.getEmailLog(id)!;
	}

	async getEmailLog(id: string): Promise<EmailLog | null> {
		return await this.db.prepare(`
			SELECT * FROM email_logs WHERE id = ?
		`).bind(id).first<EmailLog>() || null;
	}

	async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog> {
		const allowedFields = [
			'status', 'retry_count', 'error_message', 'sent_at', 'bounced_at', 'failed_at'
		];
		
		const setClause: string[] = [];
		const values: any[] = [];

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key) && value !== undefined) {
				setClause.push(`${key} = ?`);
				values.push(value);
			}
		}

		if (setClause.length === 0) {
			return this.getEmailLog(id)!;
		}

		setClause.push('updated_at = ?');
		values.push(Math.floor(Date.now() / 1000));
		values.push(id);

		await this.db.prepare(`
			UPDATE email_logs SET ${setClause.join(', ')} WHERE id = ?
		`).bind(...values).run();

		return this.getEmailLog(id)!;
	}

	async getPendingEmailLogs(limit = 100): Promise<EmailLog[]> {
		const result = await this.db.prepare(`
			SELECT * FROM email_logs 
			WHERE status IN ('queued', 'failed') 
			AND retry_count < max_retries
			ORDER BY created_at ASC
			LIMIT ?
		`).bind(limit).all<EmailLog>();
		return result.results || [];
	}

	// Invoice view tokens
	async createViewToken(token: Omit<InvoiceViewToken, 'id' | 'created_at'>): Promise<InvoiceViewToken> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db.prepare(`
			INSERT INTO invoice_view_tokens (
				id, invoice_id, token, expires_at, view_count,
				last_viewed_at, last_viewed_ip, last_viewed_user_agent, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			token.invoice_id,
			token.token,
			token.expires_at,
			token.view_count || 0,
			token.last_viewed_at || null,
			token.last_viewed_ip || null,
			token.last_viewed_user_agent || null,
			now
		).run();

		return this.getViewTokenByToken(token.token)!;
	}

	async getViewTokenByToken(token: string): Promise<InvoiceViewToken | null> {
		return await this.db.prepare(`
			SELECT * FROM invoice_view_tokens WHERE token = ?
		`).bind(token).first<InvoiceViewToken>() || null;
	}

	async recordTokenView(token: string, ip: string, userAgent: string): Promise<void> {
		const now = Math.floor(Date.now() / 1000);
		await this.db.prepare(`
			UPDATE invoice_view_tokens 
			SET view_count = view_count + 1,
				last_viewed_at = ?,
				last_viewed_ip = ?,
				last_viewed_user_agent = ?
			WHERE token = ?
		`).bind(now, ip, userAgent, token).run();
	}

	// Credit notes
	async createCreditNote(creditNote: Omit<CreditNote, 'id' | 'created_at' | 'updated_at'>): Promise<CreditNote> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db.prepare(`
			INSERT INTO credit_notes (
				id, company_id, invoice_id, credit_number, credit_date,
				reason, total_amount, pdf_url, pdf_sha256, created_by, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			creditNote.company_id,
			creditNote.invoice_id,
			creditNote.credit_number,
			creditNote.credit_date,
			creditNote.reason,
			creditNote.total_amount,
			creditNote.pdf_url || null,
			creditNote.pdf_sha256 || null,
			creditNote.created_by,
			now,
			now
		).run();

		return this.getCreditNote(id)!;
	}

	async getCreditNote(id: string): Promise<CreditNote | null> {
		return await this.db.prepare(`
			SELECT * FROM credit_notes WHERE id = ?
		`).bind(id).first<CreditNote>() || null;
	}

	async getNextCreditNumber(companyId: string, year: number): Promise<string> {
		// Use same sequence table but increment it
		const result = await this.db.prepare(`
			SELECT sequence FROM invoice_sequences 
			WHERE company_id = ? AND year = ?
		`).bind(companyId, year).first<{ sequence: number }>();

		let nextSequence: number;
		if (result) {
			nextSequence = result.sequence + 1;
			await this.db.prepare(`
				UPDATE invoice_sequences SET sequence = ? 
				WHERE company_id = ? AND year = ?
			`).bind(nextSequence, companyId, year).run();
		} else {
			nextSequence = 1;
			await this.db.prepare(`
				INSERT INTO invoice_sequences (company_id, year, sequence)
				VALUES (?, ?, ?)
			`).bind(companyId, year, nextSequence).run();
		}

		return `${year}-CR-${String(nextSequence).padStart(6, '0')}`;
	}

	// Audit logs
	async createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db.prepare(`
			INSERT INTO audit_logs (
				id, company_id, user_id, action, resource_type, resource_id,
				old_values, new_values, ip_address, user_agent, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			log.company_id,
			log.user_id || null,
			log.action,
			log.resource_type,
			log.resource_id,
			log.old_values || null,
			log.new_values || null,
			log.ip_address || null,
			log.user_agent || null,
			now
		).run();
	}

	// Reminders
	async createReminder(reminder: Omit<InvoiceReminder, 'id' | 'created_at'>): Promise<InvoiceReminder> {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db.prepare(`
			INSERT INTO invoice_reminders (
				id, invoice_id, reminder_type, scheduled_for, sent_at, email_log_id, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			reminder.invoice_id,
			reminder.reminder_type,
			reminder.scheduled_for,
			reminder.sent_at || null,
			reminder.email_log_id || null,
			now
		).run();

		return this.getReminder(id)!;
	}

	async getReminder(id: string): Promise<InvoiceReminder | null> {
		return await this.db.prepare(`
			SELECT * FROM invoice_reminders WHERE id = ?
		`).bind(id).first<InvoiceReminder>() || null;
	}

	async getPendingReminders(limit = 100): Promise<InvoiceReminder[]> {
		const now = Math.floor(Date.now() / 1000);
		const result = await this.db.prepare(`
			SELECT * FROM invoice_reminders 
			WHERE sent_at IS NULL AND scheduled_for <= ?
			ORDER BY scheduled_for ASC
			LIMIT ?
		`).bind(now, limit).all<InvoiceReminder>();
		return result.results || [];
	}

	async markReminderSent(id: string, emailLogId: string): Promise<void> {
		const now = Math.floor(Date.now() / 1000);
		await this.db.prepare(`
			UPDATE invoice_reminders 
			SET sent_at = ?, email_log_id = ?
			WHERE id = ?
		`).bind(now, emailLogId, id).run();
	}

	// Templates
	async getTemplate(id: string): Promise<Template | null> {
		return await this.db.prepare(`
			SELECT * FROM templates WHERE id = ?
		`).bind(id).first<Template>() || null;
	}

	async getDefaultTemplate(companyId: string, type: 'invoice' | 'credit_note'): Promise<Template | null> {
		return await this.db.prepare(`
			SELECT * FROM templates 
			WHERE company_id = ? AND template_type = ? AND is_default = 1
			LIMIT 1
		`).bind(companyId, type).first<Template>() || null;
	}
}
