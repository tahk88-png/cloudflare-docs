// TypeScript types for the invoicing system

export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';
export type InvoiceStatus = 'draft' | 'sent' | 'payment_pending' | 'paid' | 'overdue' | 'cancelled';
export type EmailStatus = 'queued' | 'sending' | 'sent' | 'bounced' | 'failed';
export type PDFMode = 'DRAFT' | 'FINAL';
export type ReminderType = 'due_date' | 'overdue' | 'custom';
export type TemplateType = 'invoice' | 'credit_note';

export interface Company {
	id: string;
	name: string;
	tax_id?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country?: string;
	email?: string;
	phone?: string;
	logo_url?: string;
	created_at: number;
	updated_at: number;
}

export interface User {
	id: string;
	company_id: string;
	email: string;
	name: string;
	role: UserRole;
	password_hash?: string;
	api_key_hash?: string;
	created_at: number;
	updated_at: number;
}

export interface Customer {
	id: string;
	company_id: string;
	name: string;
	email?: string;
	tax_id?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country?: string;
	phone?: string;
	reminder_days: number;
	reminder_enabled: boolean;
	created_at: number;
	updated_at: number;
}

export interface InvoiceItem {
	id?: string;
	invoice_id?: string;
	description: string;
	quantity: number;
	unit_price: number;
	vat_rate: number;
	line_total: number;
	line_vat: number;
	line_total_with_vat: number;
	sort_order?: number;
	created_at?: number;
}

export interface Invoice {
	id: string;
	company_id: string;
	invoice_number: string;
	customer_id: string;
	status: InvoiceStatus;
	invoice_date: number;
	due_date: number;
	currency: string;
	vat_rate: number;
	subtotal: number;
	vat_amount: number;
	total: number;
	notes?: string;
	payment_link?: string;
	pdf_url?: string;
	pdf_sha256?: string;
	pdf_mode?: PDFMode;
	sent_at?: number;
	paid_at?: number;
	created_by: string;
	created_at: number;
	updated_at: number;
	// Joined data
	customer?: Customer;
	items?: InvoiceItem[];
	company?: Company;
}

export interface CreditNote {
	id: string;
	company_id: string;
	invoice_id: string;
	credit_number: string;
	credit_date: number;
	reason: string;
	total_amount: number;
	pdf_url?: string;
	pdf_sha256?: string;
	created_by: string;
	created_at: number;
	updated_at: number;
}

export interface EmailLog {
	id: string;
	invoice_id: string;
	to_email: string;
	subject: string;
	status: EmailStatus;
	retry_count: number;
	max_retries: number;
	error_message?: string;
	sent_at?: number;
	bounced_at?: number;
	failed_at?: number;
	created_at: number;
	updated_at: number;
}

export interface InvoiceReminder {
	id: string;
	invoice_id: string;
	reminder_type: ReminderType;
	scheduled_for: number;
	sent_at?: number;
	email_log_id?: string;
	created_at: number;
}

export interface InvoiceViewToken {
	id: string;
	invoice_id: string;
	token: string;
	expires_at: number;
	view_count: number;
	last_viewed_at?: number;
	last_viewed_ip?: string;
	last_viewed_user_agent?: string;
	created_at: number;
}

export interface AuditLog {
	id: string;
	company_id: string;
	user_id?: string;
	action: string;
	resource_type: string;
	resource_id: string;
	old_values?: string;
	new_values?: string;
	ip_address?: string;
	user_agent?: string;
	created_at: number;
}

export interface Template {
	id: string;
	company_id: string;
	name: string;
	template_type: TemplateType;
	html_content: string;
	css_content?: string;
	is_default: boolean;
	created_at: number;
	updated_at: number;
}

// API Request/Response types
export interface CreateInvoiceRequest {
	customer_id: string;
	invoice_date: string; // ISO date string
	due_date: string; // ISO date string
	currency?: string;
	vat_rate?: number;
	notes?: string;
	items: Array<{
		description: string;
		quantity: number;
		unit_price: number;
		vat_rate?: number;
	}>;
}

export interface UpdateInvoiceRequest {
	customer_id?: string;
	invoice_date?: string;
	due_date?: string;
	currency?: string;
	vat_rate?: number;
	notes?: string;
	items?: Array<{
		id?: string;
		description: string;
		quantity: number;
		unit_price: number;
		vat_rate?: number;
	}>;
}

export interface SendEmailRequest {
	to_email: string;
	subject?: string;
	message?: string;
}

export interface PaymentWebhookPayload {
	provider: 'stripe' | 'montonio';
	event_type: string;
	invoice_id?: string;
	payment_intent_id?: string;
	amount?: number;
	currency?: string;
	status?: string;
	metadata?: Record<string, string>;
}

export interface Env {
	DB: D1Database;
	QUEUE: Queue;
	R2_PDFS: R2Bucket;
	EMAIL_FROM: string;
	EMAIL_REPLY_TO: string;
	DOMAIN: string;
	JWT_SECRET: string;
	STRIPE_SECRET_KEY?: string;
	MONTONIO_SECRET_KEY?: string;
}
