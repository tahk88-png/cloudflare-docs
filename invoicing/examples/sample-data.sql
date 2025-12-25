-- Sample data for testing the invoicing system

-- Insert sample company
INSERT INTO companies (id, name, email, vat_number, address, city, postal_code, country, default_vat_rate, invoice_prefix)
VALUES ('company_1', 'Acme Corporation', 'billing@acme.com', 'US123456789', '123 Main St', 'San Francisco', '94105', 'USA', 22, 'INV');

-- Insert sample users
INSERT INTO users (id, company_id, email, password_hash, name, role, is_active)
VALUES 
  ('user_1', 'company_1', 'admin@acme.com', 'hash123', 'John Admin', 'owner', 1),
  ('user_2', 'company_1', 'accountant@acme.com', 'hash456', 'Jane Accountant', 'accountant', 1),
  ('user_3', 'company_1', 'viewer@acme.com', 'hash789', 'Bob Viewer', 'viewer', 1);

-- Insert sample customers
INSERT INTO customers (id, company_id, name, email, vat_number, address, city, postal_code, country, payment_terms, is_active)
VALUES 
  ('cust_1', 'company_1', 'TechStart Inc', 'billing@techstart.com', 'US987654321', '456 Oak Ave', 'Los Angeles', '90001', 'USA', 30, 1),
  ('cust_2', 'company_1', 'Global Solutions Ltd', 'accounts@globalsolutions.com', 'UK123456789', '789 King St', 'London', 'SW1A 1AA', 'UK', 60, 1),
  ('cust_3', 'company_1', 'Digital Agency', 'finance@digitalagency.com', NULL, '321 Pine Rd', 'New York', '10001', 'USA', 15, 1);

-- Insert VAT rates
INSERT INTO vat_rates (id, company_id, rate, description, is_default, is_active)
VALUES 
  ('vat_1', 'company_1', 0, 'Zero Rate (Exempt)', 0, 1),
  ('vat_2', 'company_1', 9, 'Reduced Rate', 0, 1),
  ('vat_3', 'company_1', 22, 'Standard Rate', 1, 1);

-- Insert email templates
INSERT INTO email_templates (id, company_id, template_type, subject, body_html, is_active)
VALUES (
  'tmpl_1', 
  'company_1', 
  'invoice_sent',
  'Invoice {{invoice_number}} from {{company_name}}',
  '<html><body><h1>Invoice {{invoice_number}}</h1><p>Dear {{customer_name}},</p><p>Please find your invoice attached.</p><p>Total: {{total}}</p><p>Due Date: {{due_date}}</p><a href="{{view_link}}">View Invoice</a></body></html>',
  1
);

-- Insert sample invoice
INSERT INTO invoices (
  id, company_id, customer_id, invoice_number, invoice_type, status,
  issue_date, due_date, currency, subtotal, vat_amount, total, paid_amount,
  is_pdf_final, reminder_count, view_count, notes, created_by
)
VALUES (
  'inv_sample_1',
  'company_1',
  'cust_1',
  '2025-000001',
  'invoice',
  'sent',
  '2025-01-15',
  '2025-02-15',
  'EUR',
  1000.00,
  220.00,
  1220.00,
  0,
  1,
  0,
  3,
  'Thank you for your business!',
  'user_1'
);

-- Insert sample invoice items
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, vat_rate, subtotal, vat_amount, total, sort_order)
VALUES 
  ('item_1', 'inv_sample_1', 'Web Development Services', 10, 100.00, 22, 1000.00, 220.00, 1220.00, 0);

-- Insert invoice sequence
INSERT INTO invoice_sequences (id, company_id, year, last_sequence)
VALUES ('seq_1', 'company_1', 2025, 1);

-- Insert sample audit log
INSERT INTO audit_logs (id, company_id, user_id, resource_type, resource_id, action, created_at)
VALUES ('audit_1', 'company_1', 'user_1', 'invoice', 'inv_sample_1', 'create', datetime('now'));

-- Queries to verify sample data
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'Invoice Items', COUNT(*) FROM invoice_items;
