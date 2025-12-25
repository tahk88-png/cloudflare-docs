
# Production-Grade B2B Invoicing + Document Signing System

## 🎯 Executive Summary

A comprehensive, multi-tenant SaaS solution for B2B invoicing with integrated document signing capabilities. Built for Cloudflare Workers with production-grade reliability, security, and compliance features.

## ✨ Key Features

### 1. Multi-Tenant Architecture
- **True multi-tenancy**: Users can belong to multiple tenants
- **Strict isolation**: Every entity includes `tenant_id` with enforced boundaries
- **RBAC**: 4 roles (owner, admin, accountant, viewer) with granular permissions
- **Session management**: Tenant-scoped sessions with automatic context switching

### 2. Invoice Management
- **Sequential numbering**: YYYY-000001 format per tenant per year
- **Status workflow**: draft → awaiting_signature → signed → sent → payment_pending → paid
- **Seller/Buyer fields**: Complete company details (reg_code, VAT, IBAN)
- **Draft editable only**: Immutable after sending
- **Credit notes**: Full support for corrections and refunds
- **Configurable VAT rates**: Database-driven, no hardcoding

### 3. PDF Generation
- **Professional A4 layout**: Logo, company details, line items, totals
- **Two modes**: 
  - DRAFT: Watermark overlay for previews
  - FINAL: Clean PDF with SHA256 hash for immutability
- **Secure storage**: R2 bucket with CDN delivery
- **Integrity verification**: SHA256 hash prevents tampering

### 4. Email Delivery (Reliable + Queued)
- **Queue-based**: Asynchronous processing with Cloudflare cron
- **Retry logic**: 3 attempts (1min, 10min, 1hour) with exponential backoff
- **States**: queued → sending → sent / bounced / failed
- **Multi-provider**: SendGrid, Mailgun, Resend support
- **Templates**: Database-stored, editable templates with variables
- **Duplicate protection**: Requires explicit override flag
- **Tracking**: Full email logs with provider message IDs

### 5. Document Signing (Integrated)
- **Document types**: Acceptance acts, contracts, invoice signing
- **Provider abstraction**: Pluggable signing providers
  - SK ID Solutions (Smart-ID, Mobile-ID for Estonia)
  - Dokobit (Baltic states)
  - DocuSign (international)
  - Dummy provider for development
- **Multiple signing methods**:
  - Smart-ID
  - Mobile-ID
  - ID card
  - Email OTP
  - Manual confirmation
- **Signing workflow**:
  1. Create document with signers
  2. Generate PDF
  3. Start signing session
  4. Send invitations
  5. Track signatures
  6. Download signed PDF
  7. Update invoice status
- **Secure tokens**: Time-limited invitation links (30 days)
- **Sequential signing**: Configurable signing order
- **Webhook integration**: Real-time status updates

### 6. Payment Integration
- **Providers**: Stripe, Montonio ready
- **Payment links**: Auto-generated per invoice
- **Webhook handling**: Status updates (paid, failed, refunded)
- **Status transitions**: sent → payment_pending → paid
- **Multiple payments**: Partial payments supported

### 7. Automated Reminders
- **Configurable schedule**: Tenant-level defaults
- **Per-invoice override**: Custom reminder settings
- **Three reminders**: +3, +10, +20 days after due date
- **Disable per customer**: Flexible reminder control
- **Email templates**: Customizable reminder emails
- **Full logging**: All sends tracked in audit logs

### 8. Audit Logging
- **Complete trail**: Every create/update/send/sign action
- **Before/After snapshots**: JSON diff for changes
- **Actor tracking**: User ID, IP, user agent
- **Entity-based**: Searchable by entity type and ID
- **Compliance ready**: SOX, GDPR requirements met

### 9. Secure View Links
- **Time-limited tokens**: 30-day expiry
- **Tracking**: View count, IP, user agent
- **Public access**: No authentication required
- **Analytics**: Track invoice engagement

### 10. API & Integration
- **RESTful API**: Clean, documented endpoints
- **OpenAPI ready**: Full specification available
- **Webhooks**: Payments, signing, email events
- **Rate limiting**: Built-in protection
- **CORS support**: Configurable origins

## 📊 Database Schema

### Core Tables

**Tenants & Users**
- `tenants` - Company/organization data
- `users` - User accounts (email, password)
- `user_tenants` - Many-to-many with roles
- `sessions` - Authentication tokens

**Invoices**
- `invoices` - Invoice master data
- `invoice_items` - Line items with VAT
- `invoice_sequences` - Per-tenant per-year numbering
- `vat_rates` - Configurable tax rates

**Documents & Signing**
- `documents` - Acceptance acts, contracts
- `document_signers` - Signer details and status
- `signature_requests` - Provider integration
- `document_views` - View tracking

**Email & Communication**
- `email_templates` - Editable templates
- `email_logs` - Queue and delivery logs
- `reminder_logs` - Reminder history

**Other**
- `invoice_view_tokens` - Secure public links
- `invoice_views` - View analytics
- `payment_webhooks` - Payment event log
- `audit_logs` - Full audit trail

## 🔐 Security Features

### Multi-Tenant Isolation
- Every query filtered by `tenant_id`
- Middleware enforces tenant boundaries
- No cross-tenant data leakage

### Authentication & Authorization
- Session-based authentication
- Bearer token support
- Role-based permissions
- API key authentication (optional)

### Data Protection
- SHA256 PDF integrity
- Immutable final invoices
- Encrypted sensitive data
- Audit trail for compliance

### API Security
- Rate limiting
- CORS configuration
- Webhook signature verification
- Input validation

## 🚀 API Endpoints

### Invoices
```
POST   /api/invoices                      Create invoice
GET    /api/invoices/:id                  Get invoice details
PUT    /api/invoices/:id                  Update invoice (draft only)
POST   /api/invoices/:id/generate-pdf     Generate PDF (draft/final)
POST   /api/invoices/:id/send-email       Queue email send
POST   /api/invoices/:id/credit-note      Create credit note
GET    /invoice-view/:token               Public invoice view
```

### Documents & Signing
```
POST   /api/documents                     Create document
GET    /api/documents/:id                 Get document details
POST   /api/documents/:id/start-signing   Start signing process
GET    /documents/sign/:token             Public signing page
POST   /api/sign                          Submit signature
```

### Webhooks
```
POST   /webhooks/payments                 Payment provider webhook
POST   /webhooks/signing                  Signing provider webhook
POST   /webhooks/email                    Email provider webhook (bounces)
```

### Admin
```
GET    /api/tenants                       List tenants for user
POST   /api/tenants                       Create tenant
GET    /api/users                         List users in tenant
POST   /api/users                         Invite user to tenant
GET    /api/audit-logs                    Audit trail
GET    /api/email-templates               List templates
PUT    /api/email-templates/:key          Update template
```

## 📋 Invoice Workflow

### Draft Phase
1. Create invoice with buyer details and items
2. System calculates totals (server-side only)
3. Generate draft PDF with watermark
4. Review and edit as needed
5. Optionally create linked acceptance act

### Signing Phase (if required)
1. Create acceptance act document
2. Add signers (seller, buyer, witness)
3. Start signing process
4. Invitations sent via email
5. Signers complete eID signature
6. Document status → signed
7. Invoice status → signed

### Sending Phase
1. Generate final PDF (no watermark)
2. Calculate and store SHA256 hash
3. Invoice becomes immutable
4. Queue email with PDF attachment
5. Send with retry logic
6. Invoice status → sent
7. Optional: generate payment link

### Payment Phase
1. Customer receives invoice + payment link
2. Makes payment via Stripe/Montonio
3. Webhook received
4. Invoice status → payment_pending
5. Payment confirmed
6. Invoice status → paid
7. Optional: send receipt email

### Reminder Phase
1. Cron job checks overdue invoices
2. Reminder_1 at +3 days after due_date
3. Reminder_2 at +10 days
4. Reminder_3 at +20 days
5. Each reminder logged in audit_logs
6. Invoice status → overdue if unpaid

## 🔧 Configuration

### Tenant Settings
```json
{
  "email_from": "no-reply@company.com",
  "email_reply_to": "support@company.com",
  "reminder_schedule": {
    "reminder_1": 3,   // days after due
    "reminder_2": 10,
    "reminder_3": 20
  },
  "require_signature_before_send": true,
  "signing_provider": "sk_id_solutions",
  "signing_provider_config": {
    "apiKey": "xxx",
    "environment": "production"
  },
  "payment_providers": ["stripe", "montonio"]
}
```

### VAT Rates (per tenant)
```sql
-- Standard rate
INSERT INTO vat_rates (tenant_id, rate, description, is_default)
VALUES ('tenant_1', 22, 'Standard Rate', 1);

-- Reduced rate
INSERT INTO vat_rates (tenant_id, rate, description, is_default)
VALUES ('tenant_1', 9, 'Reduced Rate', 0);

-- Zero rate
INSERT INTO vat_rates (tenant_id, rate, description, is_default)
VALUES ('tenant_1', 0, 'Zero Rate', 0);
```

### Email Templates
```sql
-- Invoice sent template
INSERT INTO email_templates (tenant_id, template_key, subject, body_html)
VALUES (
  'tenant_1',
  'invoice_sent',
  'Invoice {{invoice_number}} from {{seller_name}}',
  '<html>...</html>'
);
```

## 🎨 UI Requirements

### Invoice Builder
- Add/remove line items
- Auto-calculate totals
- Select VAT rate per item
- Buyer autocomplete
- Due date calculator
- Terms & conditions editor

### PDF Preview
- Draft preview button
- Side-by-side comparison
- Watermark visibility toggle

### Send Modal
- Recipient email confirmation
- Attachment preview
- Duplicate send warning
- Send history
- Schedule send (optional)

### Document Signing
- Create acceptance act
- Add multiple signers
- Choose signing methods
- Status timeline
- Resend invitations

### Audit Timeline
- Chronological event list
- User avatars
- Action descriptions
- Before/after diffs
- Export capability

## 🧪 Testing

### Unit Tests
- Invoice calculations
- VAT rounding
- Number generation
- Email templating
- PDF generation

### Integration Tests
- Full invoice workflow
- Signing process
- Payment webhooks
- Email delivery
- Reminder automation

### E2E Tests
- Create → Sign → Send → Pay workflow
- Multi-tenant isolation
- Permission boundaries
- Concurrent operations

## 📈 Performance & Scalability

### Database Optimization
- Indexed foreign keys
- Compound indexes on queries
- Efficient pagination
- Query result caching

### Background Jobs
- Email queue processing (5min cron)
- Reminder checks (5min cron)
- Token cleanup (daily cron)
- Webhook retries

### Caching Strategy
- Public invoice views
- PDF CDN delivery
- Template caching
- Session caching

## 🛠️ Development

### Local Setup
```bash
cd invoicing
npm install
wrangler d1 create invoicing
wrangler d1 execute invoicing --file=schema-enhanced.sql
npm run dev
```

### Environment Variables
```bash
# Email provider
wrangler secret put EMAIL_API_KEY

# Signing provider
wrangler secret put SIGNING_API_KEY
wrangler secret put SIGNING_WEBHOOK_SECRET

# Payment providers
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put MONTONIO_API_KEY
```

### Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## 📚 Documentation

- **API Reference**: `API-REFERENCE.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Database Schema**: `schema-enhanced.sql`
- **Type Definitions**: `types-enhanced.ts`
- **Example Requests**: `examples/api-examples.http`

## 🔒 Compliance

### GDPR
- Personal data encryption
- Right to be forgotten (soft deletes)
- Data export functionality
- Audit logs for access tracking

### SOX
- Immutable financial records
- Complete audit trail
- Role-based access control
- Automated controls

### PCI DSS
- No credit card storage
- Payment provider integration only
- Secure API communication
- Regular security audits

## 🎯 Acceptance Criteria Checklist

- [x] No invoice totals calculated in frontend
- [x] Draft edits prevented after sent/signed
- [x] PDF final is immutable with SHA256
- [x] Email send is queued with retry and logs
- [x] Signing flow works end-to-end
- [x] All critical actions in audit logs
- [x] Multi-tenant boundaries enforced
- [x] RBAC permissions on all endpoints
- [x] Configurable VAT rates
- [x] Credit notes supported
- [x] Payment webhooks functional
- [x] Reminder system automated
- [x] View links secure and tracked
- [x] Email templates editable
- [x] Document signing integrated

## 🚀 Future Enhancements

### Phase 2
- [ ] Recurring invoices
- [ ] Invoice templates
- [ ] Batch operations
- [ ] Advanced reporting
- [ ] OCR for expense receipts

### Phase 3
- [ ] Mobile app
- [ ] Offline mode
- [ ] Multi-currency support
- [ ] AI-powered insights
- [ ] Integration marketplace

## 📞 Support

For technical support or questions:
- Documentation: `/docs`
- API Status: `/api/health`
- Audit Logs: `/api/audit-logs`
- Email: support@example.com

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-25  
**License**: Proprietary  
