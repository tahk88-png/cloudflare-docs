-- Tenants Table
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  email_settings_json TEXT, -- JSON: {fromName, fromEmail, replyTo}
  invoice_settings_json TEXT, -- JSON: {nextNumber, prefix, dateFormat, currency}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- OWNER, ADMIN, ACCOUNTANT, VIEWER
  name TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Customers Table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  vat_number TEXT,
  payment_terms_days INTEGER DEFAULT 14,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Invoices Table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL, -- DRAFT, SENT, PAID, VOID, OVERDUE
  subtotal REAL NOT NULL,
  vat_total REAL NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  notes TEXT,
  pdf_url TEXT,
  pdf_sha256 TEXT,
  items_json TEXT NOT NULL, -- JSON array of items
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  sent_at DATETIME,
  paid_at DATETIME,
  viewed_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  UNIQUE(tenant_id, number)
);

-- Email Logs
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- QUEUED, SENDING, SENT, BOUNCED, FAILED
  attempts INTEGER DEFAULT 0,
  last_attempt_at DATETIME,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details_json TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- View Tokens
CREATE TABLE view_tokens (
  token TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
