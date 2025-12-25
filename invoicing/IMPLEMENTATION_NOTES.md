# Implementation Notes

## Completed Features

✅ All core features have been implemented:

1. **Invoice Numbering**: YYYY-000001 format, unique per company per year
2. **Immutable PDFs**: Final PDFs stored with SHA256 hash after sending
3. **Dual PDF Modes**: DRAFT (watermarked) and FINAL (clean)
4. **Email Queue**: Reliable delivery with retries and delivery states
5. **Secure View Links**: Time-limited tokens with view logging (IP, user agent, timestamp)
6. **Payment Integration**: Stripe/Montonio webhook handlers
7. **Automated Reminders**: Configurable per customer with scheduled processing
8. **Accounting Rules**: VAT rates (0/9/22%), proper rounding, credit notes
9. **Multi-Tenant RBAC**: owner/admin/accountant/viewer roles with permission checks
10. **Audit Logging**: Complete action history with IP and user agent

## Architecture

- **Worker Entry Point**: `index.ts` - handles fetch, queue, and scheduled events
- **Database Layer**: `db.ts` - all database operations
- **PDF Service**: `pdf.ts` - PDF generation (currently placeholder - see below)
- **Email Service**: `email.ts` - queue-based email delivery with retries
- **Accounting**: `accounting.ts` - VAT calculations, rounding, validation
- **Auth**: `auth.ts` - RBAC and authentication
- **API Routes**: `api/routes.ts` - all HTTP endpoints
- **Queue Consumer**: `queue.ts` - processes email queue
- **Scheduled Tasks**: `scheduled.ts` - reminders and overdue checks

## Important Notes

### PDF Generation

The current PDF generation (`pdf.ts`) uses a placeholder implementation. For production:

1. **Option 1**: Use a third-party service (PDFShift, HTMLPDF, etc.)
   ```typescript
   const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
     method: 'POST',
     headers: { 'Authorization': `Basic ${btoa(apiKey)}` },
     body: JSON.stringify({ source: html, format: 'A4' })
   });
   ```

2. **Option 2**: Use Puppeteer via external service
   - Deploy a separate Worker with Puppeteer
   - Call it via fetch

3. **Option 3**: Use PDFKit (if available for Workers)
   - Check compatibility with Cloudflare Workers runtime

### Email Delivery

The `deliverEmail()` method in `email.ts` is a placeholder. Replace with:

1. **Cloudflare Email Workers** (recommended for Cloudflare stack)
2. **SendGrid/Mailgun API** (third-party services)
3. **AWS SES** (if using AWS)

### Authentication

The authentication system (`auth.ts`) has placeholder implementations:

1. **JWT**: Implement proper signing/verification using `crypto.subtle`
2. **API Keys**: Implement proper hashing (bcrypt, argon2) - currently uses SHA-256
3. **Session Management**: Add session tokens if needed

### Database Queries

Some queries could be optimized:
- `getInvoicesByStatus()` loads items sequentially - could batch load
- Consider adding pagination metadata
- Add database indexes for common query patterns

### Error Handling

- Add more specific error types
- Implement retry logic for transient failures
- Add monitoring/alerting for critical errors

### Testing

Add tests for:
- Invoice creation and numbering
- PDF generation (both modes)
- Email queue processing
- Payment webhooks
- RBAC permissions
- Credit note creation

### Security

- Add rate limiting
- Validate all inputs
- Sanitize HTML in PDF generation
- Implement CSRF protection for webhooks
- Add request signing for webhooks

## Deployment Checklist

- [ ] Create D1 database
- [ ] Run migrations
- [ ] Create R2 bucket
- [ ] Create queue
- [ ] Set environment variables (secrets)
- [ ] Update PDF generation implementation
- [ ] Update email delivery implementation
- [ ] Implement proper authentication
- [ ] Set up monitoring/alerts
- [ ] Configure domain and routes
- [ ] Test all endpoints
- [ ] Set up backups

## API Examples

See `README.md` for complete API documentation and examples.

## File Structure

```
invoicing/
├── index.ts                 # Main worker entry point
├── types.ts                 # TypeScript types
├── db.ts                    # Database operations
├── pdf.ts                   # PDF generation
├── email.ts                 # Email service
├── accounting.ts            # Accounting utilities
├── auth.ts                  # Authentication & RBAC
├── queue.ts                 # Queue consumer
├── scheduled.ts             # Scheduled tasks
├── api/
│   └── routes.ts           # API route handlers
├── migrations/
│   └── 0001_initial.sql    # Database schema
├── schema.sql              # Schema reference
├── wrangler.toml           # Worker configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── README.md               # Documentation
└── IMPLEMENTATION_NOTES.md # This file
```
