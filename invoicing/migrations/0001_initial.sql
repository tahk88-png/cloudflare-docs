-- Initial migration for invoicing system
-- Run this with: wrangler d1 execute invoicing-db --file=./migrations/0001_initial.sql

-- Companies/Tenants
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tax_id TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Users with RBAC
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'accountant', 'viewer')),
    password_hash TEXT,
    api_key_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    tax_id TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    phone TEXT,
    reminder_days INTEGER DEFAULT 7,
    reminder_enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- Invoice Templates
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK(template_type IN ('invoice', 'credit_note')),
    html_content TEXT NOT NULL,
    css_content TEXT,
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(company_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'payment_pending', 'paid', 'overdue', 'cancelled')),
    invoice_date INTEGER NOT NULL,
    due_date INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    vat_rate REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL DEFAULT 0.0,
    vat_amount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    payment_link TEXT,
    pdf_url TEXT,
    pdf_sha256 TEXT,
    pdf_mode TEXT CHECK(pdf_mode IN ('DRAFT', 'FINAL')),
    sent_at INTEGER,
    paid_at INTEGER,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(company_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit_price REAL NOT NULL,
    vat_rate REAL NOT NULL DEFAULT 0.0,
    line_total REAL NOT NULL,
    line_vat REAL NOT NULL,
    line_total_with_vat REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Credit Notes
CREATE TABLE IF NOT EXISTS credit_notes (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES invoices(id),
    credit_number TEXT NOT NULL,
    credit_date INTEGER NOT NULL,
    reason TEXT NOT NULL,
    total_amount REAL NOT NULL,
    pdf_url TEXT,
    pdf_sha256 TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(company_id, credit_number)
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('queued', 'sending', 'sent', 'bounced', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at INTEGER,
    bounced_at INTEGER,
    failed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_email_logs_invoice ON email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_retry ON email_logs(status, retry_count) WHERE status IN ('queued', 'sending', 'failed');

-- Invoice Reminders
CREATE TABLE IF NOT EXISTS invoice_reminders (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK(reminder_type IN ('due_date', 'overdue', 'custom')),
    scheduled_for INTEGER NOT NULL,
    sent_at INTEGER,
    email_log_id TEXT REFERENCES email_logs(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON invoice_reminders(scheduled_for) WHERE sent_at IS NULL;

-- Invoice View Tokens
CREATE TABLE IF NOT EXISTS invoice_view_tokens (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    view_count INTEGER DEFAULT 0,
    last_viewed_at INTEGER,
    last_viewed_ip TEXT,
    last_viewed_user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_view_tokens_token ON invoice_view_tokens(token);
CREATE INDEX IF NOT EXISTS idx_view_tokens_invoice ON invoice_view_tokens(invoice_id);
CREATE INDEX IF NOT EXISTS idx_view_tokens_expires ON invoice_view_tokens(expires_at);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Invoice Number Sequence
CREATE TABLE IF NOT EXISTS invoice_sequences (
    company_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (company_id, year)
);

CREATE INDEX IF NOT EXISTS idx_sequences_lookup ON invoice_sequences(company_id, year);
