-- Invoicing system schema (Cloudflare D1 / SQLite)
-- Notes:
-- - Amounts are stored in minor units (cents) as integers.
-- - Quantities are stored as integer thousandths (qty_milli) to support fractional quantities.
-- - Invoice numbering is unique per tenant per year: YYYY-000001 (year, seq).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL,
	name TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
	tenant_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
	created_at TEXT NOT NULL,
	PRIMARY KEY (tenant_id, user_id),
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS api_keys (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	key_hash TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL,
	revoked_at TEXT,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS customers (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	address_json TEXT,
	vat_number TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS templates (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('invoice_email', 'reminder_email')),
	subject TEXT NOT NULL,
	body_html TEXT NOT NULL,
	body_text TEXT,
	is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS invoice_counters (
	tenant_id TEXT NOT NULL,
	year INTEGER NOT NULL,
	next_seq INTEGER NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (tenant_id, year),
	FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS invoices (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	customer_id TEXT NOT NULL,
	type TEXT NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice', 'credit')),
	original_invoice_id TEXT, -- set for credits
	status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'payment_pending', 'paid', 'void')),

	currency TEXT NOT NULL DEFAULT 'EUR',
	issue_date TEXT,
	due_date TEXT,

	year INTEGER,
	seq INTEGER,
	number TEXT, -- YYYY-000001, unique per tenant

	pdf_r2_key TEXT,
	pdf_url TEXT,
	pdf_sha256 TEXT,
	pdf_finalized_at TEXT,

	sent_at TEXT,
	paid_at TEXT,

	payment_provider TEXT, -- e.g. stripe|montonio
	payment_url TEXT,

	note TEXT,
	totals_json TEXT NOT NULL, -- cached totals + VAT breakdown (JSON)

	created_by_user_id TEXT,
	updated_by_user_id TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,

	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (customer_id) REFERENCES customers(id),
	FOREIGN KEY (original_invoice_id) REFERENCES invoices(id),
	FOREIGN KEY (created_by_user_id) REFERENCES users(id),
	FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_number_unique
	ON invoices(tenant_id, number)
	WHERE number IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoices_tenant_status_idx
	ON invoices(tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS invoice_items (
	id TEXT PRIMARY KEY,
	invoice_id TEXT NOT NULL,
	description TEXT NOT NULL,
	qty_milli INTEGER NOT NULL,
	unit_price_cents INTEGER NOT NULL,
	vat_rate INTEGER NOT NULL CHECK (vat_rate IN (0, 9, 22)),
	created_at TEXT NOT NULL,
	FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx
	ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS email_logs (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	invoice_id TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('invoice', 'reminder')),

	to_email TEXT NOT NULL,
	from_email TEXT NOT NULL,
	reply_to TEXT NOT NULL,
	subject TEXT NOT NULL,
	body_html TEXT NOT NULL,
	body_text TEXT,

	state TEXT NOT NULL CHECK (state IN ('queued', 'sending', 'sent', 'bounced', 'failed')),
	attempt_count INTEGER NOT NULL DEFAULT 0,
	last_error TEXT,
	provider TEXT,
	provider_message_id TEXT,

	queued_at TEXT NOT NULL,
	sending_at TEXT,
	sent_at TEXT,
	bounced_at TEXT,
	failed_at TEXT,
	next_attempt_at TEXT,

	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS email_logs_state_next_attempt_idx
	ON email_logs(state, next_attempt_at);

CREATE TABLE IF NOT EXISTS invoice_view_tokens (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	invoice_id TEXT NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	first_viewed_at TEXT,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS invoice_view_tokens_invoice_idx
	ON invoice_view_tokens(invoice_id, expires_at);

CREATE TABLE IF NOT EXISTS invoice_views (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	invoice_id TEXT NOT NULL,
	token_id TEXT NOT NULL,
	viewed_at TEXT NOT NULL,
	ip TEXT,
	user_agent TEXT,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id),
	FOREIGN KEY (token_id) REFERENCES invoice_view_tokens(id)
);

CREATE TABLE IF NOT EXISTS reminder_configs (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	scope_type TEXT NOT NULL CHECK (scope_type IN ('customer', 'invoice')),
	scope_id TEXT NOT NULL, -- customer_id or invoice_id
	days_after_sent_json TEXT NOT NULL, -- e.g. [7,14]
	enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS reminder_configs_scope_idx
	ON reminder_configs(tenant_id, scope_type, scope_id);

CREATE TABLE IF NOT EXISTS reminder_sends (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	invoice_id TEXT NOT NULL,
	email_log_id TEXT NOT NULL,
	scheduled_for TEXT NOT NULL,
	sent_at TEXT,
	created_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id),
	FOREIGN KEY (email_log_id) REFERENCES email_logs(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS reminder_sends_unique
	ON reminder_sends(tenant_id, invoice_id, scheduled_for);

CREATE TABLE IF NOT EXISTS audit_logs (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	actor_user_id TEXT,
	action TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id TEXT NOT NULL,
	data_json TEXT,
	ip TEXT,
	user_agent TEXT,
	created_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx
	ON audit_logs(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS payment_events (
	id TEXT PRIMARY KEY,
	tenant_id TEXT NOT NULL,
	invoice_id TEXT NOT NULL,
	provider TEXT NOT NULL,
	event_id TEXT,
	payload_json TEXT NOT NULL,
	received_at TEXT NOT NULL,
	FOREIGN KEY (tenant_id) REFERENCES tenants(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
