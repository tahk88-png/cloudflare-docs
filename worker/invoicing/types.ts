export type Role = "owner" | "admin" | "accountant" | "viewer";

export type InvoiceType = "invoice" | "credit";

export type InvoiceStatus =
	| "draft"
	| "sent"
	| "payment_pending"
	| "paid"
	| "void";

export type EmailState = "queued" | "sending" | "sent" | "bounced" | "failed";

export type EmailKind = "invoice" | "reminder";

export type TemplateKind = "invoice_email" | "reminder_email";

export type VatRate = 0 | 9 | 22;

export type ReminderScopeType = "customer" | "invoice";

export interface InvoiceItemInput {
	description: string;
	/**
	 * Quantity in thousandths (e.g. 1.5 => 1500). Accept both `quantity` (number)
	 * and `qty_milli` (integer) in API parsing.
	 */
	qty_milli: number;
	unit_price_cents: number;
	vat_rate: VatRate;
}

export interface CustomerInput {
	name: string;
	email: string;
	address?: unknown;
	vat_number?: string;
}

export interface ReminderConfigInput {
	days_after_sent: number[];
}
