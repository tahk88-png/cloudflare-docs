# Quick Start Guide

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Node.js 22+

## Setup Steps

### 1. Install Dependencies

```bash
cd invoicing
npm install
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create invoicing-db
# Copy the database_id from output to wrangler.toml

# Create R2 bucket
wrangler r2 bucket create invoicing-pdfs

# Create queue
wrangler queues create email-queue
```

### 3. Update Configuration

Edit `wrangler.toml` and add the `database_id` from step 2.

### 4. Run Migrations

```bash
# Local development
wrangler d1 execute invoicing-db --local --file=./migrations/0001_initial.sql

# Production
wrangler d1 execute invoicing-db --file=./migrations/0001_initial.sql
```

### 5. Set Secrets

```bash
wrangler secret put EMAIL_FROM
wrangler secret put EMAIL_REPLY_TO
wrangler secret put DOMAIN
wrangler secret put JWT_SECRET
# Optional:
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put MONTONIO_SECRET_KEY
```

### 6. Deploy

```bash
wrangler deploy
```

## Testing the API

### Create a Company (Manual SQL)

```sql
INSERT INTO companies (id, name) VALUES ('company-1', 'Test Company');
```

### Create a User (Manual SQL)

```sql
INSERT INTO users (id, company_id, email, name, role)
VALUES ('user-1', 'company-1', 'admin@test.com', 'Admin User', 'admin');
```

### Create a Customer

```bash
curl -X POST https://your-worker.workers.dev/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "customer@test.com"
  }'
```

### Create an Invoice

```bash
curl -X POST https://your-worker.workers.dev/api/invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "customer-id",
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-15",
    "currency": "EUR",
    "vat_rate": 0.22,
    "items": [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unit_price": 100.00,
        "vat_rate": 0.22
      }
    ]
  }'
```

### Generate PDF

```bash
curl -X POST https://your-worker.workers.dev/api/invoices/{invoice-id}/generate-pdf \
  -H "Authorization: Bearer <token>"
```

### Send Email

```bash
curl -X POST https://your-worker.workers.dev/api/invoices/{invoice-id}/send-email \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "customer@test.com"
  }'
```

## Next Steps

1. Implement proper PDF generation (see IMPLEMENTATION_NOTES.md)
2. Implement proper email delivery (see IMPLEMENTATION_NOTES.md)
3. Implement proper authentication (JWT signing, API key hashing)
4. Add tests
5. Set up monitoring
6. Configure domain and custom routes

## Support

See `README.md` for complete API documentation.
See `IMPLEMENTATION_NOTES.md` for implementation details and production considerations.
