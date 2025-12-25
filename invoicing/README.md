# Production-Grade Invoicing System

A comprehensive, accountant-approved invoicing system built with Cloudflare Workers, featuring PDF generation, reliable email delivery, payment integration, and full audit logging.

## Features

### ✅ Core Features

1. **Invoice Numbering**: Automatic sequential numbering per year (YYYY-000001), unique per company/tenant
2. **Immutable PDFs**: Final PDFs are locked with SHA256 hash verification
3. **Draft/Final PDFs**: Draft watermark for previews, clean final PDFs after sending
4. **Email Delivery**: Robust queue system with retries and delivery tracking
5. **Secure View Links**: Time-limited tokens with IP and user-agent tracking
6. **Payment Integration**: Ready for Stripe/Montonio with webhook support
7. **Automated Reminders**: Configurable per invoice and per customer
8. **Accounting Rules**: VAT rates (0/9/22%), proper rounding, credit notes
9. **Multi-Tenant**: Full company isolation with RBAC
10. **Audit Logging**: Complete audit trail for accountability

### 🔐 RBAC Roles

- **Owner**: Full access to everything
- **Admin**: Manage invoices, customers, users (except settings)
- **Accountant**: Create/edit invoices, manage customers, view reports
- **Viewer**: Read-only access to invoices and reports

### 📧 Email Delivery

- Queue-based system with exponential backoff retry (5min, 30min, 2h)
- Delivery states: `queued` → `sending` → `sent` / `bounced` / `failed`
- Configurable From/Reply-To addresses
- Automatic reminder system with configurable intervals

### 💰 Payment Tracking

- Invoice states: `draft` → `sent` → `payment_pending` → `paid`
- Webhook support for Stripe and Montonio
- Automatic status updates on payment
- Payment link generation

### 📄 Credit Notes

- Create credit notes for issued invoices
- Negative line items
- Automatically adjusts original invoice balance
- Full audit trail

## Installation

### Prerequisites

- Node.js 22+
- Cloudflare account with Workers enabled
- D1 database (SQLite)
- R2 bucket for PDF storage

### Setup

1. **Clone and install dependencies:**

```bash
cd invoicing
npm install
```

2. **Create D1 database:**

```bash
wrangler d1 create invoicing
```

Copy the database ID to `wrangler.toml`.

3. **Initialize database schema:**

```bash
npm run db:init
```

4. **Create R2 bucket:**

```bash
wrangler r2 bucket create invoices
```

5. **Set secrets:**

```bash
wrangler secret put EMAIL_API_KEY
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put MONTONIO_API_KEY
wrangler secret put MONTONIO_WEBHOOK_SECRET
```

6. **Deploy:**

```bash
npm run deploy:staging  # Deploy to staging
npm run deploy:production  # Deploy to production
```

## API Documentation

### Authentication

All API endpoints (except `/invoice-view/{token}`) require authentication via Bearer token:

```
Authorization: Bearer <your-token>
```

### Endpoints

#### POST /api/invoices

Create a new invoice.

**Request:**

```json
{
  "customer_id": "cust_123",
  "issue_date": "2025-01-15",
  "due_date": "2025-02-15",
  "items": [
    {
      "description": "Web Development Services",
      "quantity": 10,
      "unit_price": 100.00,
      "vat_rate": 22
    }
  ],
  "notes": "Thank you for your business",
  "terms_and_conditions": "Payment due within 30 days",
  "reminder_settings": {
    "enabled": true,
    "days_before": [7, 3, 1],
    "days_after": [1, 7, 14]
  }
}
```

**Response:**

```json
{
  "invoice": {
    "id": "inv_abc123",
    "invoice_number": "2025-000001",
    "status": "draft",
    "total": 1220.00,
    ...
  },
  "items": [...],
  "customer": {...},
  "company": {...}
}
```

#### GET /api/invoices/{id}

Get invoice details.

**Response:**

```json
{
  "invoice": {...},
  "items": [...],
  "customer": {...},
  "company": {...}
}
```

#### PUT /api/invoices/{id}

Update invoice (draft only).

**Request:**

```json
{
  "due_date": "2025-02-28",
  "items": [...],
  "notes": "Updated notes"
}
```

#### POST /api/invoices/{id}/generate-pdf

Generate PDF for invoice.

**Request:**

```json
{
  "mode": "draft"  // or "final"
}
```

**Response:**

```json
{
  "pdf_url": "https://...",
  "pdf_sha256": "abc123...",
  "mode": "draft",
  "is_final": false
}
```

#### POST /api/invoices/{id}/send-email

Send invoice via email.

**Request:**

```json
{
  "recipient_email": "customer@example.com",  // Optional, defaults to customer email
  "subject": "Invoice #2025-000001",  // Optional, uses default template
  "body": "Custom email body",  // Optional, uses default template
  "include_pdf": true
}
```

**Response:**

```json
{
  "email_id": "email_xyz789",
  "status": "queued",
  "recipient": "customer@example.com",
  "view_url": "https://.../invoice-view/token123",
  "message": "Invoice email queued for delivery"
}
```

#### POST /api/invoices/{id}/credit-note

Create credit note for an invoice.

**Request:**

```json
{
  "invoice_id": "inv_abc123",
  "items": [
    {
      "description": "Refund for cancelled service",
      "quantity": 5,
      "unit_price": 100.00,
      "vat_rate": 22
    }
  ],
  "notes": "Credit note for partial refund"
}
```

#### GET /invoice-view/{token}

Public invoice view (no authentication required).

Returns HTML page with invoice details.

#### POST /webhooks/payments

Payment webhook handler for Stripe/Montonio.

**Request (Stripe):**

```json
{
  "provider": "stripe",
  "event_type": "payment_intent.succeeded",
  "event_id": "evt_123",
  "invoice_id": "inv_abc123",
  "amount": 1220.00,
  "payment_reference": "pi_123"
}
```

**Request (Montonio):**

```json
{
  "provider": "montonio",
  "event_type": "payment.completed",
  "event_id": "mon_123",
  "invoice_id": "inv_abc123",
  "amount": 1220.00,
  "payment_reference": "pay_123"
}
```

## Database Schema

### Tables

- `companies` - Multi-tenant company data
- `users` - User accounts with RBAC
- `customers` - Customer information
- `invoices` - Invoices and credit notes
- `invoice_items` - Line items
- `invoice_sequences` - Sequential numbering per year
- `invoice_view_tokens` - Secure view links
- `email_logs` - Email delivery tracking
- `reminder_logs` - Reminder history
- `payment_webhooks` - Payment event log
- `audit_logs` - Full audit trail
- `email_templates` - Customizable email templates
- `vat_rates` - VAT rate configuration
- `sessions` - User sessions
- `api_keys` - API access keys

## Configuration

### Email Providers

Supported email providers:

- **SendGrid**: Set `EMAIL_PROVIDER=sendgrid` and `EMAIL_API_KEY`
- **Mailgun**: Set `EMAIL_PROVIDER=mailgun` and `EMAIL_API_KEY`
- **Resend**: Set `EMAIL_PROVIDER=resend` and `EMAIL_API_KEY`
- **Console** (dev): Set `EMAIL_PROVIDER=console` for logging only

### Payment Providers

- **Stripe**: Set `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET`
- **Montonio**: Set `MONTONIO_API_KEY` and `MONTONIO_WEBHOOK_SECRET`

### Scheduled Tasks

Cron job runs every 5 minutes to:
- Process email queue
- Send automated reminders
- Clean up expired tokens (daily at 3 AM)

## Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# View logs
npm run tail

# Database console
npm run db:console "SELECT * FROM invoices LIMIT 10"
```

## Production Deployment

### Checklist

- [ ] Set all required secrets
- [ ] Configure email provider
- [ ] Set up payment provider webhooks
- [ ] Test email delivery
- [ ] Test payment webhooks
- [ ] Review audit logs
- [ ] Set up monitoring
- [ ] Configure backups

### Monitoring

Monitor these metrics:
- Email delivery success rate
- Payment webhook success rate
- API response times
- Database query performance
- Error rates

## Security

### Best Practices

1. **Authentication**: All API endpoints require valid session tokens
2. **RBAC**: Role-based permissions enforced on all operations
3. **PDF Integrity**: SHA256 hashing prevents tampering
4. **Audit Logging**: Complete audit trail for compliance
5. **Multi-Tenancy**: Strong company isolation
6. **Secure Tokens**: Time-limited view tokens with tracking
7. **Immutability**: Final invoices cannot be edited (use credit notes)

### Compliance

- **GDPR**: Audit logs include IP and user-agent tracking
- **SOX**: Immutable invoices with full audit trail
- **PCI**: No credit card data stored (use payment providers)

## Troubleshooting

### Email not sending

1. Check email provider configuration
2. Verify API key is set correctly
3. Check email logs: `SELECT * FROM email_logs WHERE status = 'failed'`
4. Review retry schedule

### Invoice not updating

1. Check if invoice is in draft status (only drafts can be edited)
2. Use credit notes for issued invoices
3. Check audit logs for error messages

### Payment webhook failing

1. Verify webhook signature
2. Check webhook endpoint URL
3. Review payment_webhooks table for error messages

## Support

For issues or questions:
- Check audit logs: `GET /api/audit-logs?resource_type=invoice&resource_id={id}`
- Review email logs: `SELECT * FROM email_logs WHERE invoice_id = ?`
- Check system health: `GET /api/health`

## License

MIT License - See LICENSE file for details
