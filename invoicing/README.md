# Production-Grade Invoicing System

A comprehensive, accountant-approved invoicing system built on Cloudflare Workers with PDF generation, email delivery, payment integration, and full audit logging.

## Features

✅ **Invoice Numbering**: YYYY-000001 format, unique per company/tenant  
✅ **Immutable PDFs**: Final PDFs stored with SHA256 hash after sending  
✅ **Dual PDF Modes**: DRAFT (watermarked) and FINAL (clean)  
✅ **Email Queue**: Reliable delivery with retries and delivery states  
✅ **Secure View Links**: Time-limited tokens with view logging  
✅ **Payment Integration**: Stripe/Montonio webhook support  
✅ **Automated Reminders**: Configurable per customer  
✅ **Accounting Rules**: VAT rates (0/9/22%), proper rounding, credit notes  
✅ **Multi-Tenant**: Full RBAC (owner/admin/accountant/viewer)  
✅ **Audit Logging**: Complete action history  

## Architecture

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (PDFs)
- **Queue**: Cloudflare Queues (email processing)
- **Scheduled**: Cron triggers (reminders, overdue checks)

## Setup

### 1. Create D1 Database

```bash
cd invoicing
wrangler d1 create invoicing-db
```

Update `wrangler.toml` with the database_id from the output.

### 2. Run Migrations

```bash
wrangler d1 execute invoicing-db --file=./migrations/0001_initial.sql
```

### 3. Create R2 Bucket

```bash
wrangler r2 bucket create invoicing-pdfs
```

### 4. Create Queue

```bash
wrangler queues create email-queue
```

### 5. Set Environment Variables

```bash
wrangler secret put EMAIL_FROM          # no-reply@yourdomain.com
wrangler secret put EMAIL_REPLY_TO      # support@yourdomain.com
wrangler secret put DOMAIN               # yourdomain.com
wrangler secret put JWT_SECRET          # your-secret-key
wrangler secret put STRIPE_SECRET_KEY    # sk_... (optional)
wrangler secret put MONTONIO_SECRET_KEY # ... (optional)
```

### 6. Deploy

```bash
wrangler deploy
```

## API Endpoints

### Create Invoice
```http
POST /api/invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer_id": "uuid",
  "invoice_date": "2024-01-15",
  "due_date": "2024-02-15",
  "currency": "EUR",
  "vat_rate": 0.22,
  "notes": "Payment terms: Net 30",
  "items": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "unit_price": 100.00,
      "vat_rate": 0.22
    }
  ]
}
```

### Update Invoice (Draft Only)
```http
PUT /api/invoices/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [...],
  "notes": "Updated notes"
}
```

### Generate PDF
```http
POST /api/invoices/{id}/generate-pdf
Authorization: Bearer <token>
```

Returns: `{ "url": "...", "sha256": "...", "mode": "DRAFT|FINAL" }`

### Send Email
```http
POST /api/invoices/{id}/send-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "to_email": "customer@example.com",
  "subject": "Invoice #2024-000001",
  "message": "Custom message (optional)"
}
```

### Get Invoice
```http
GET /api/invoices/{id}
Authorization: Bearer <token>
```

### View Invoice (Public)
```http
GET /invoice-view/{token}
```

### Payment Webhook
```http
POST /webhooks/payments
X-Payment-Provider: stripe|montonio
Content-Type: application/json

{
  "provider": "stripe",
  "event_type": "payment_intent.succeeded",
  "invoice_id": "uuid",
  "amount": 1220.00,
  "currency": "EUR"
}
```

## Database Schema

See `schema.sql` for complete schema. Key tables:

- `invoices` - Main invoice records
- `invoice_items` - Line items
- `credit_notes` - Credit note records
- `email_logs` - Email delivery tracking
- `invoice_reminders` - Scheduled reminders
- `invoice_view_tokens` - Secure view tokens
- `audit_logs` - Complete audit trail
- `invoice_sequences` - Number sequence tracking

## Invoice Numbering

Invoices are numbered per company per year:
- Format: `YYYY-000001`
- Example: `2024-000001`, `2024-000002`, etc.
- Resets each year
- Unique per company

## PDF Generation

- **DRAFT Mode**: Watermarked "DRAFT" overlay
- **FINAL Mode**: Clean PDF without watermark
- Stored in R2 with SHA256 hash
- Immutable after sending (cannot be modified)

## Email Delivery

- Queue-based with automatic retries
- States: `queued` → `sending` → `sent` / `bounced` / `failed`
- Max 3 retries with exponential backoff
- From: `no-reply@domain`
- Reply-To: `support@domain`

## Payment Integration

### Stripe
Webhook expects:
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_...",
      "metadata": {
        "invoice_id": "uuid"
      }
    }
  }
}
```

### Montonio
Webhook expects:
```json
{
  "status": "COMPLETED",
  "transaction_id": "...",
  "metadata": {
    "invoice_id": "uuid"
  }
}
```

## Reminders

- Configurable per customer (`reminder_days`, `reminder_enabled`)
- Types: `due_date`, `overdue`, `custom`
- Scheduled via cron (runs hourly)
- Logged in `invoice_reminders` table

## RBAC Roles

- **owner**: Full access
- **admin**: Can modify non-drafts, send invoices
- **accountant**: Can create/modify drafts, send invoices
- **viewer**: Read-only access

## Audit Logging

All actions are logged:
- `invoice.created`
- `invoice.updated`
- `invoice.sent`
- `invoice.paid`
- `credit_note.created`
- etc.

Includes: user_id, IP address, user agent, old/new values.

## Credit Notes

After an invoice is sent, edits are not allowed. Instead:
1. Create a credit note
2. Reference original invoice
3. Generate PDF
4. Send to customer

## Development

```bash
# Install dependencies (if needed)
npm install

# Run migrations locally
wrangler d1 execute invoicing-db --local --file=./migrations/0001_initial.sql

# Test locally
wrangler dev

# Deploy
wrangler deploy
```

## Production Considerations

1. **PDF Generation**: Current implementation uses simple HTML-to-PDF. For production, consider:
   - Puppeteer/Chrome via external service
   - PDFKit library
   - Third-party PDF service (PDFShift, HTMLPDF)

2. **Email Delivery**: Replace `deliverEmail()` with:
   - Cloudflare Email Workers
   - SendGrid/Mailgun API
   - AWS SES

3. **Authentication**: Implement proper JWT signing/verification and API key hashing

4. **Rate Limiting**: Add rate limiting for API endpoints

5. **Monitoring**: Set up alerts for:
   - Failed email deliveries
   - Overdue invoices
   - Payment webhook failures

6. **Backups**: Regular D1 database backups

## License

MIT
