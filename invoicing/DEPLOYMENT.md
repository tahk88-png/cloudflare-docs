# Deployment Guide

This guide walks through deploying the invoicing system to Cloudflare Workers.

## Prerequisites

- Cloudflare account
- Node.js 22+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare Workers Paid plan (for D1 and R2)

## Step-by-Step Deployment

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Create D1 Database

```bash
# Create the database
wrangler d1 create invoicing

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "invoicing"
# database_id = "xxx-xxx-xxx"
```

Copy the `database_id` and update it in `wrangler.toml`.

### 3. Initialize Database Schema

```bash
# Apply the schema
wrangler d1 execute invoicing --file=./schema.sql

# Verify tables were created
wrangler d1 execute invoicing --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### 4. Load Sample Data (Optional)

```bash
wrangler d1 execute invoicing --file=./examples/sample-data.sql
```

### 5. Create R2 Bucket

```bash
# Create bucket for PDF storage
wrangler r2 bucket create invoices

# Verify bucket was created
wrangler r2 bucket list
```

### 6. Configure Secrets

```bash
# Email provider API key
wrangler secret put EMAIL_API_KEY
# Enter your SendGrid/Mailgun/Resend API key

# Stripe secrets (if using Stripe)
wrangler secret put STRIPE_API_KEY
# Enter your Stripe secret key

wrangler secret put STRIPE_WEBHOOK_SECRET
# Enter your Stripe webhook signing secret

# Montonio secrets (if using Montonio)
wrangler secret put MONTONIO_API_KEY
# Enter your Montonio API key

wrangler secret put MONTONIO_WEBHOOK_SECRET
# Enter your Montonio webhook secret
```

### 7. Update Configuration

Edit `wrangler.toml` and update:

```toml
[vars]
EMAIL_PROVIDER = "sendgrid"  # or "mailgun", "resend"
ENABLE_SCHEDULED_TASKS = "true"
```

### 8. Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# Test the deployment
curl https://invoicing-system-staging.your-workers.dev/api/health
```

### 9. Test the System

```bash
# Create a test company (via D1)
wrangler d1 execute invoicing --command "
INSERT INTO companies (id, name, email, default_vat_rate, invoice_prefix)
VALUES ('test_company', 'Test Company', 'test@example.com', 22, 'TEST');
"

# Create a test user
wrangler d1 execute invoicing --command "
INSERT INTO users (id, company_id, email, password_hash, name, role, is_active)
VALUES ('test_user', 'test_company', 'admin@test.com', 'hash123', 'Test Admin', 'owner', 1);
"

# Create a session token
wrangler d1 execute invoicing --command "
INSERT INTO sessions (id, user_id, token, expires_at)
VALUES ('sess_1', 'test_user', 'test_token_123', datetime('now', '+30 days'));
"

# Test creating an invoice
curl -X POST https://invoicing-system-staging.your-workers.dev/api/invoices \
  -H "Authorization: Bearer test_token_123" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "test_customer",
    "issue_date": "2025-01-15",
    "items": [
      {
        "description": "Test Service",
        "quantity": 1,
        "unit_price": 100.00,
        "vat_rate": 22
      }
    ]
  }'
```

### 10. Deploy to Production

```bash
# After successful staging tests
npm run deploy:production

# Verify production deployment
curl https://invoicing-system-production.your-workers.dev/api/health
```

### 11. Set Up Monitoring

```bash
# Tail logs in real-time
npm run tail

# Or for specific environment
wrangler tail --env production
```

### 12. Configure Webhooks

#### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-worker.workers.dev/webhooks/payments`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy webhook signing secret and set it:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET --env production
   ```

#### Montonio Webhook

1. Go to Montonio Dashboard → Settings → Webhooks
2. Add endpoint: `https://your-worker.workers.dev/webhooks/payments`
3. Copy webhook secret and set it:
   ```bash
   wrangler secret put MONTONIO_WEBHOOK_SECRET --env production
   ```

## Environment Variables

### Required

- `EMAIL_API_KEY`: API key for email provider
- `DB`: D1 database binding (auto-configured)
- `INVOICES_BUCKET`: R2 bucket binding (auto-configured)

### Optional

- `EMAIL_PROVIDER`: Email service provider (default: "console")
- `ENABLE_SCHEDULED_TASKS`: Enable cron jobs (default: "true")
- `STRIPE_API_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `MONTONIO_API_KEY`: Montonio API key
- `MONTONIO_WEBHOOK_SECRET`: Montonio webhook secret

## Scheduled Tasks

The system automatically runs these tasks every 5 minutes:

1. **Email Queue Processing**: Sends queued emails with retry logic
2. **Reminder Processing**: Sends automated payment reminders
3. **Token Cleanup**: Cleans up expired view tokens (daily at 3 AM)

To disable scheduled tasks:

```bash
# In wrangler.toml
[vars]
ENABLE_SCHEDULED_TASKS = "false"
```

## Database Migrations

If you need to modify the schema:

```bash
# Create migration file
wrangler d1 migrations create invoicing add_new_feature

# Edit the migration file in migrations/
# Then apply it:
npm run db:migrations:apply
```

## Backup and Recovery

### Backup D1 Database

```bash
# Export database to SQL
wrangler d1 export invoicing --output=backup.sql

# Or query-based backup
wrangler d1 execute invoicing --command ".backup backup.db"
```

### Restore D1 Database

```bash
# Restore from SQL file
wrangler d1 execute invoicing --file=backup.sql
```

### Backup R2 Bucket

```bash
# Download all PDFs
wrangler r2 object list invoices
wrangler r2 object get invoices/path/to/file.pdf --file=local-file.pdf
```

## Scaling Considerations

### Performance

- **D1**: 50,000 reads/day (free), 100,000+ (paid)
- **R2**: Unlimited storage, first 10GB free
- **Workers**: 100,000 requests/day (free), unlimited (paid)

### Optimization

1. **Caching**: Use Cloudflare Cache API for public invoice views
2. **Batch Operations**: Process multiple emails in one cron run
3. **Indexes**: Already optimized in schema
4. **Connection Pooling**: Workers automatically handle this

### High Volume

For >10,000 invoices/month:

1. Enable Workers paid plan
2. Increase email batch size in cron job
3. Consider sharding companies across multiple Workers
4. Use Durable Objects for real-time updates

## Troubleshooting

### Error: "Database not found"

```bash
# Verify database binding
wrangler d1 list

# Check wrangler.toml has correct database_id
```

### Error: "Email sending failed"

```bash
# Check secrets are set
wrangler secret list

# Verify email provider API key
# Check email logs in database
wrangler d1 execute invoicing --command "SELECT * FROM email_logs WHERE status='failed' ORDER BY created_at DESC LIMIT 10"
```

### Error: "PDF generation failed"

```bash
# Check R2 bucket exists
wrangler r2 bucket list

# Verify bucket binding in wrangler.toml
# Check worker logs
npm run tail
```

## Security Checklist

- [ ] Rotate all API keys and secrets
- [ ] Enable Cloudflare WAF rules
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure CORS properly
- [ ] Use HTTPS only
- [ ] Implement API key rotation policy
- [ ] Set up alerting for failed payments
- [ ] Regular security audits
- [ ] Backup strategy in place

## Monitoring Dashboard

Create custom Cloudflare Dashboard with:

1. **Request rate**: Total requests/minute
2. **Error rate**: 5xx errors/minute
3. **Email success rate**: Sent/Failed ratio
4. **Database queries**: Query duration
5. **Webhook events**: Success/failure rate

## Support

If you encounter issues:

1. Check logs: `npm run tail`
2. Review audit logs in database
3. Check email logs for delivery issues
4. Verify webhook signatures
5. Contact Cloudflare support for infrastructure issues

## Next Steps

After deployment:

1. Set up custom domain
2. Configure email templates
3. Create company accounts
4. Train users on system
5. Monitor for first 24 hours
6. Set up alerts and notifications
7. Document custom workflows
8. Plan regular backups
