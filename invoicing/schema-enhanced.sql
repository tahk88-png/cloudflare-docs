-- Enhanced B2B Invoicing + Document Signing Schema
-- Production-grade multi-tenant SaaS with document signing integration

-- ===========================================
-- MULTI-TENANT + USERS
-- ===========================================

-- Tenants (companies)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    reg_code TEXT, -- Registration/company code
    vat_number TEXT,
    iban TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    logo_url TEXT,
    invoice_prefix TEXT DEFAULT 'INV',
    default_currency TEXT DEFAULT 'EUR',
    settings TEXT, -- JSON: email config, reminder settings, signing requirements, etc.
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Users (can belong to multiple tenants)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- User-Tenant relationships with roles
CREATE TABLE IF NOT EXISTS user_tenants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'accountant', 'viewer')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON user_tenants(tenant_id);

-- ===========================================
-- CONFIGURABLE VAT RATES
-- ===========================================

CREATE TABLE IF NOT EXISTS vat_rates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    rate REAL NOT NULL, -- e.g., 0, 9, 22
    description TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_vat_rates_tenant ON vat_rates(tenant_id);

-- ===========================================
-- INVOICES (ENHANCED WITH SELLER/BUYER DETAILS)
-- ===========================================

-- Invoice sequences per tenant per year
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_sequence INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, year)
);

CREATE INDEX idx_invoice_sequences_tenant_year ON invoice_sequences(tenant_id, year);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_type TEXT NOT NULL DEFAULT 'invoice' CHECK(invoice_type IN ('invoice', 'credit_note')),
    parent_invoice_id TEXT, -- For credit notes
    
    -- Status flow: draft -> awaiting_signature -> signed -> sent -> payment_pending -> paid
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
        'draft', 'awaiting_signature', 'signed', 'sent', 
        'payment_pending', 'paid', 'overdue', 'cancelled', 'void'
    )),
    
    -- Dates
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    paid_at TEXT,
    
    -- Seller details (snapshot at invoice creation)
    seller_name TEXT NOT NULL,
    seller_reg_code TEXT,
    seller_vat_number TEXT,
    seller_iban TEXT,
    seller_address TEXT,
    seller_email TEXT,
    seller_phone TEXT,
    
    -- Buyer details
    buyer_name TEXT NOT NULL,
    buyer_reg_code TEXT,
    buyer_vat_number TEXT,
    buyer_email TEXT NOT NULL,
    buyer_address TEXT,
    buyer_phone TEXT,
    
    -- Financial
    currency TEXT DEFAULT 'EUR',
    subtotal REAL NOT NULL DEFAULT 0,
    vat_total REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    
    -- PDF management
    pdf_draft_url TEXT,
    pdf_final_url TEXT,
    pdf_final_sha256 TEXT, -- Immutable hash for final PDF
    pdf_generated_at TEXT,
    
    -- Email tracking
    sent_at TEXT,
    sent_to_email TEXT,
    email_message_id TEXT,
    
    -- Payment integration
    payment_provider TEXT, -- stripe, montonio, bank_transfer
    payment_link_url TEXT,
    payment_reference TEXT,
    
    -- Additional fields
    notes TEXT,
    internal_notes TEXT, -- Not visible to customer
    terms_and_conditions TEXT,
    footer_text TEXT,
    
    -- Reminder settings (override tenant defaults)
    reminder_settings TEXT, -- JSON
    last_reminder_sent_at TEXT,
    reminder_count INTEGER DEFAULT 0,
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT NOT NULL, -- user_id
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_parent ON invoices(parent_invoice_id);
CREATE INDEX idx_invoices_buyer_email ON invoices(buyer_email);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    vat_percent REAL NOT NULL, -- From vat_rates table
    line_total REAL NOT NULL, -- Server-calculated: (quantity * unit_price) * (1 + vat_percent/100)
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_tenant ON invoice_items(tenant_id);

-- ===========================================
-- DOCUMENT SIGNING MODULE
-- ===========================================

-- Documents (acceptance acts, contracts, invoice signing)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('acceptance_act', 'contract', 'invoice')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
        'draft', 'awaiting_signature', 'signed', 'declined', 'failed', 'cancelled'
    )),
    
    -- Relationships
    related_invoice_id TEXT, -- Link to invoice
    
    -- Document metadata
    title TEXT NOT NULL,
    description TEXT,
    
    -- PDF files
    pdf_url TEXT, -- Original unsigned PDF
    pdf_sha256 TEXT,
    signed_pdf_url TEXT, -- Signed PDF with certificates
    signed_pdf_sha256 TEXT,
    
    -- Signing completion
    signed_at TEXT,
    all_signed_at TEXT, -- When all required signers completed
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_invoice ON documents(related_invoice_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(type);

-- Document signers
CREATE TABLE IF NOT EXISTS document_signers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    
    -- Signer details
    role TEXT NOT NULL CHECK(role IN ('seller', 'buyer', 'witness')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT, -- Required for SmartID/MobileID
    personal_code TEXT, -- Required for some signing methods
    
    -- Signing method
    signing_method TEXT NOT NULL CHECK(signing_method IN (
        'smartid', 'mobileid', 'idcard', 'email_otp', 'manual'
    )),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
        'pending', 'invited', 'opened', 'signed', 'declined', 'failed', 'expired'
    )),
    
    -- Signing details
    signed_at TEXT,
    signature_value TEXT, -- Digital signature
    certificate TEXT, -- Signing certificate
    
    -- Invitation
    invitation_sent_at TEXT,
    invitation_token TEXT UNIQUE,
    invitation_expires_at TEXT,
    
    -- Order (for sequential signing)
    signing_order INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 1,
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_signers_document ON document_signers(document_id);
CREATE INDEX idx_document_signers_tenant ON document_signers(tenant_id);
CREATE INDEX idx_document_signers_status ON document_signers(status);
CREATE INDEX idx_document_signers_token ON document_signers(invitation_token);

-- Signature requests (provider integration)
CREATE TABLE IF NOT EXISTS signature_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    
    -- Provider details
    provider TEXT NOT NULL CHECK(provider IN (
        'sk_id_solutions', 'dokobit', 'docusign', 'custom', 'dummy'
    )),
    provider_request_id TEXT,
    provider_session_id TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
        'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    )),
    
    -- Error handling
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Webhook
    webhook_received_at TEXT,
    webhook_payload TEXT, -- JSON
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_signature_requests_document ON signature_requests(document_id);
CREATE INDEX idx_signature_requests_provider_id ON signature_requests(provider_request_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);

-- Document views tracking
CREATE TABLE IF NOT EXISTS document_views (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    signer_id TEXT, -- If viewing via signing link
    viewed_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (signer_id) REFERENCES document_signers(id) ON DELETE SET NULL
);

CREATE INDEX idx_document_views_document ON document_views(document_id);

-- ===========================================
-- EMAIL SYSTEM (ENHANCED WITH TEMPLATES)
-- ===========================================

-- Email templates (stored in DB, editable)
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    template_key TEXT NOT NULL, -- invoice_sent, invoice_signed_and_sent, reminder_1, etc.
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables TEXT, -- JSON: available variables like {{invoice_number}}, {{buyer_name}}
    is_active INTEGER DEFAULT 1,
    is_system INTEGER DEFAULT 0, -- System templates can't be deleted
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, template_key)
);

CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX idx_email_templates_key ON email_templates(template_key);

-- Email queue and logs
CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT,
    document_id TEXT,
    
    -- Email details
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL DEFAULT 'no-reply@domain.com',
    reply_to_email TEXT NOT NULL DEFAULT 'support@domain.com',
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Template used
    template_key TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN (
        'queued', 'sending', 'sent', 'bounced', 'failed'
    )),
    
    -- Provider integration
    provider TEXT, -- sendgrid, mailgun, resend
    provider_message_id TEXT,
    
    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TEXT,
    
    -- Timestamps
    sent_at TEXT,
    delivered_at TEXT,
    bounced_at TEXT,
    failed_at TEXT,
    
    -- Error handling
    error_message TEXT,
    
    -- Attachments metadata
    attachments TEXT, -- JSON array of {filename, url}
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_invoice ON email_logs(invoice_id);
CREATE INDEX idx_email_logs_document ON email_logs(document_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_next_retry ON email_logs(next_retry_at);

-- ===========================================
-- INVOICE VIEW TOKENS
-- ===========================================

CREATE TABLE IF NOT EXISTS invoice_view_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_view_tokens_tenant ON invoice_view_tokens(tenant_id);
CREATE INDEX idx_view_tokens_invoice ON invoice_view_tokens(invoice_id);
CREATE INDEX idx_view_tokens_token ON invoice_view_tokens(token);

-- Invoice views (minimal tracking)
CREATE TABLE IF NOT EXISTS invoice_views (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    viewed_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_views_invoice ON invoice_views(invoice_id);

-- ===========================================
-- PAYMENT WEBHOOKS
-- ===========================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE,
    payload TEXT NOT NULL, -- JSON
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
    processed_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_webhooks_tenant ON payment_webhooks(tenant_id);
CREATE INDEX idx_payment_webhooks_invoice ON payment_webhooks(invoice_id);
CREATE INDEX idx_payment_webhooks_event ON payment_webhooks(event_id);

-- ===========================================
-- AUDIT LOGS (ENHANCED)
-- ===========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    actor_user_id TEXT, -- Who performed the action
    
    -- Entity details
    entity_type TEXT NOT NULL, -- invoice, document, signer, email, etc.
    entity_id TEXT NOT NULL,
    
    -- Action
    action TEXT NOT NULL, -- create, update, delete, send, sign, decline, etc.
    
    -- Changes tracking
    before_json TEXT, -- Snapshot before change
    after_json TEXT, -- Snapshot after change
    
    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    
    -- Additional context
    metadata TEXT, -- JSON for extra context
    
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ===========================================
-- SESSIONS
-- ===========================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT, -- Current active tenant context
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ===========================================
-- REMINDER LOGS
-- ===========================================

CREATE TABLE IF NOT EXISTS reminder_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    email_log_id TEXT,
    reminder_type TEXT NOT NULL, -- reminder_1, reminder_2, reminder_3
    days_after_due INTEGER,
    sent_at TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (email_log_id) REFERENCES email_logs(id) ON DELETE SET NULL
);

CREATE INDEX idx_reminder_logs_tenant ON reminder_logs(tenant_id);
CREATE INDEX idx_reminder_logs_invoice ON reminder_logs(invoice_id);
