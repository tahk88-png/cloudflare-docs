-- Production-Grade Invoicing System Database Schema
-- Designed for Cloudflare D1 (SQLite)

-- Companies/Tenants table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    vat_number TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    logo_url TEXT,
    default_vat_rate INTEGER DEFAULT 22, -- 0, 9, or 22
    default_payment_terms INTEGER DEFAULT 30, -- days
    invoice_prefix TEXT, -- e.g., "INV"
    settings TEXT, -- JSON: email templates, reminder settings, etc.
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Users table with RBAC
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'accountant', 'viewer')),
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    vat_number TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    payment_terms INTEGER DEFAULT 30, -- days
    reminder_settings TEXT, -- JSON: {enabled: true, days_before: [7, 3, 1], days_after: [1, 7, 14]}
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);

-- Invoice sequence tracking per company per year
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_sequence INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, year)
);

CREATE INDEX idx_invoice_sequences_company_year ON invoice_sequences(company_id, year);

-- Invoices table (includes credit notes via type field)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL, -- Format: YYYY-000001
    invoice_type TEXT NOT NULL DEFAULT 'invoice' CHECK(invoice_type IN ('invoice', 'credit_note')),
    parent_invoice_id TEXT, -- For credit notes, references original invoice
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'payment_pending', 'paid', 'overdue', 'cancelled', 'void')),
    
    -- Dates
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    
    -- Financial details
    currency TEXT DEFAULT 'EUR',
    subtotal REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    
    -- PDF details (immutable after sending)
    pdf_url TEXT, -- URL to PDF in R2 storage
    pdf_sha256 TEXT, -- SHA256 hash of the final PDF
    pdf_generated_at TEXT,
    is_pdf_final INTEGER DEFAULT 0, -- 1 = immutable, 0 = can regenerate
    
    -- Payment details
    payment_method TEXT, -- stripe, montonio, bank_transfer, etc.
    payment_reference TEXT, -- external payment ID
    payment_link TEXT, -- Stripe/Montonio payment link
    
    -- Reminder settings (overrides customer settings if set)
    reminder_settings TEXT, -- JSON
    last_reminder_sent_at TEXT,
    reminder_count INTEGER DEFAULT 0,
    
    -- Additional data
    notes TEXT,
    internal_notes TEXT, -- Not visible on PDF
    terms_and_conditions TEXT,
    footer_text TEXT,
    
    -- Tracking
    sent_at TEXT,
    viewed_at TEXT,
    view_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT NOT NULL, -- user_id
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_parent ON invoices(parent_invoice_id);

-- Invoice items (line items)
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    vat_rate INTEGER NOT NULL, -- 0, 9, or 22
    subtotal REAL NOT NULL,
    vat_amount REAL NOT NULL,
    total REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Invoice view tokens (secure, time-limited)
CREATE TABLE IF NOT EXISTS invoice_view_tokens (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    viewed_at TEXT,
    viewer_ip TEXT,
    viewer_user_agent TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_view_tokens_token ON invoice_view_tokens(token);
CREATE INDEX idx_view_tokens_invoice ON invoice_view_tokens(invoice_id);
CREATE INDEX idx_view_tokens_expires ON invoice_view_tokens(expires_at);

-- Email logs (delivery tracking)
CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    from_email TEXT NOT NULL DEFAULT 'no-reply@domain.com',
    reply_to_email TEXT NOT NULL DEFAULT 'support@domain.com',
    
    -- Delivery status
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'sending', 'sent', 'bounced', 'failed')),
    
    -- Queue and retry management
    queue_id TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TEXT,
    
    -- Delivery tracking
    sent_at TEXT,
    delivered_at TEXT,
    bounced_at TEXT,
    failed_at TEXT,
    error_message TEXT,
    
    -- External service tracking
    provider TEXT, -- sendgrid, mailgun, resend, etc.
    provider_message_id TEXT,
    
    -- Metadata
    metadata TEXT, -- JSON: additional tracking data
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_logs_invoice ON email_logs(invoice_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_next_retry ON email_logs(next_retry_at);

-- Reminder logs
CREATE TABLE IF NOT EXISTS reminder_logs (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    email_log_id TEXT,
    reminder_type TEXT NOT NULL, -- 'before_due', 'on_due', 'overdue'
    days_offset INTEGER, -- negative for before due, positive for after due
    sent_at TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (email_log_id) REFERENCES email_logs(id)
);

CREATE INDEX idx_reminder_logs_invoice ON reminder_logs(invoice_id);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- Payment webhooks log
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    provider TEXT NOT NULL, -- stripe, montonio
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE,
    payload TEXT NOT NULL, -- JSON
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
    processed_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_payment_webhooks_invoice ON payment_webhooks(invoice_id);
CREATE INDEX idx_payment_webhooks_event ON payment_webhooks(event_id);
CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(status);

-- Audit logs (full audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    resource_type TEXT NOT NULL, -- invoice, customer, user, etc.
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL, -- create, update, delete, send, view, pay, etc.
    changes TEXT, -- JSON: {before: {...}, after: {...}}
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT, -- JSON: additional context
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    template_type TEXT NOT NULL, -- invoice_sent, reminder, payment_received, etc.
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables TEXT, -- JSON: list of available variables
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, template_type)
);

CREATE INDEX idx_email_templates_company ON email_templates(company_id);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);

-- VAT rates configuration
CREATE TABLE IF NOT EXISTS vat_rates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    rate INTEGER NOT NULL, -- 0, 9, 22
    description TEXT NOT NULL, -- e.g., "Standard Rate", "Reduced Rate", "Zero Rate"
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_vat_rates_company ON vat_rates(company_id);

-- API keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scopes TEXT, -- JSON: array of permissions
    last_used_at TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
