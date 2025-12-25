# API Reference

Complete API documentation for the B2B Invoicing + Document Signing System.

## Base URL

```
Production: https://invoicing-production.your-workers.dev
Staging:    https://invoicing-staging.your-workers.dev
Dev:        http://localhost:1111
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-token>
```

### Get Session Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "tenants": [
    {
      "tenant_id": "tenant_abc",
      "role": "owner"
    }
  ]
}
```

## Invoices

### Create Invoice

```http
POST /api/invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "buyer_name": "Acme Corporation",
  "buyer_reg_code": "12345678",
  "buyer_vat_number": "EE123456789",
  "buyer_email": "billing@acme.com",
  "buyer_address": "123 Main St, Tallinn, Estonia",
  "issue_date": "2025-01-15",
  "due_date": "2025-02-15",
  "items": [
    {
      "description": "Web Development Services",
      "quantity": 10,
      "unit_price": 100.00,
      "vat_percent": 22
    },
    {
      "description": "Hosting Services",
      "quantity": 1,
      "unit_price": 50.00,
      "vat_percent": 0
    }
  ],
  "notes": "Payment due within 30 days",
  "terms_and_conditions": "Standard terms apply",
  "require_signature": false
}
```

**Response 201:**
```json
{
  "invoice": {
    "id": "inv_abc123",
    "tenant_id": "tenant_xyz",
    "invoice_number": "2025-000001",
    "status": "draft",
    "issue_date": "2025-01-15",
    "due_date": "2025-02-15",
    "seller_name": "My Company Ltd",
    "seller_reg_code": "87654321",
    "seller_iban": "EE123456789012345678",
    "buyer_name": "Acme Corporation",
    "buyer_email": "billing@acme.com",
    "currency": "EUR",
    "subtotal": 1050.00,
    "vat_total": 220.00,
    "total": 1270.00,
    "paid_amount": 0,
    "created_at": "2025-01-15T10:30:00Z"
  },
  "items": [...]
}
```

### Get Invoice

```http
GET /api/invoices/{id}
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "invoice": {...},
  "items": [...],
  "related_documents": [
    {
      "id": "doc_xyz",
      "type": "acceptance_act",
      "status": "signed"
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
  "due_date": "2025-02-28",
  "items": [
    {
      "description": "Updated service description",
      "quantity": 15,
      "unit_price": 100.00,
      "vat_percent": 22
    }
  ],
  "notes": "Updated payment terms"
}
```

**Response 200:**
```json
{
  "invoice": {...},
  "items": [...]
}
```

**Error 400 (if not draft):**
```json
{
  "error": "Cannot edit non-draft invoice. Create a credit note instead."
}
```

### Generate PDF

```http
POST /api/invoices/{id}/generate-pdf
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "draft"  // or "final"
}
```

**Response 200:**
```json
{
  "pdf_url": "https://storage.example.com/invoices/tenant_xyz/2025-000001/draft.pdf",
  "pdf_sha256": "a1b2c3d4e5f6...",
  "mode": "draft",
  "is_final": false,
  "generated_at": "2025-01-15T10:35:00Z"
}
```

**Note:** Final PDFs are immutable and cannot be regenerated.

### Send Invoice Email

```http
POST /api/invoices/{id}/send-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "to_email": "billing@acme.com",  // Optional, defaults to buyer_email
  "template_key": "invoice_sent",  // Optional, uses default
  "include_acceptance_act": true,  // Optional, attach signed acceptance act
  "force_resend": false            // Optional, override duplicate check
}
```

**Response 200:**
```json
{
  "email_id": "email_xyz789",
  "status": "queued",
  "recipient": "billing@acme.com",
  "view_url": "https://app.example.com/invoice-view/token123",
  "message": "Invoice email queued for delivery",
  "estimated_delivery": "2025-01-15T10:37:00Z"
}
```

**Error 400 (duplicate send):**
```json
{
  "error": "Invoice already sent. Use force_resend=true to override.",
  "sent_at": "2025-01-15T10:30:00Z",
  "sent_to": "billing@acme.com"
}
```

### Create Credit Note

```http
POST /api/invoices/{id}/credit-note
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "description": "Refund for cancelled service",
      "quantity": 5,
      "unit_price": 100.00,
      "vat_percent": 22
    }
  ],
  "notes": "Partial refund for service cancellation"
}
```

**Response 201:**
```json
{
  "credit_note": {
    "id": "inv_credit_456",
    "invoice_number": "2025-000002",
    "invoice_type": "credit_note",
    "parent_invoice_id": "inv_abc123",
    "total": -610.00,  // Negative amount
    "status": "draft"
  },
  "items": [...],
  "original_invoice": {...}
}
```

### Public Invoice View

```http
GET /invoice-view/{token}
```

No authentication required. Returns HTML page with invoice details.

**Response 200:** HTML page

**Error 403:**
```html
<html>
  <body>
    <h1>403</h1>
    <p>Token expired or invalid</p>
  </body>
</html>
```

## Documents & Signing

### Create Document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "acceptance_act",  // or "contract", "invoice"
  "related_invoice_id": "inv_abc123",  // Optional
  "title": "Acceptance Act for Invoice 2025-000001",
  "description": "Service completion acknowledgment",
  "signers": [
    {
      "role": "seller",
      "name": "John Doe",
      "email": "john@mycompany.com",
      "phone": "+37212345678",
      "personal_code": "37001010001",
      "signing_method": "smartid",
      "signing_order": 1,
      "is_required": true
    },
    {
      "role": "buyer",
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "phone": "+37298765432",
      "personal_code": "48002020002",
      "signing_method": "mobileid",
      "signing_order": 2,
      "is_required": true
    }
  ]
}
```

**Response 201:**
```json
{
  "document": {
    "id": "doc_xyz789",
    "type": "acceptance_act",
    "status": "draft",
    "title": "Acceptance Act for Invoice 2025-000001",
    "pdf_url": "https://storage.example.com/documents/tenant_xyz/doc_xyz789/document.pdf",
    "pdf_sha256": "abc123...",
    "created_at": "2025-01-15T10:40:00Z"
  },
  "signers": [
    {
      "id": "signer_1",
      "name": "John Doe",
      "email": "john@mycompany.com",
      "role": "seller",
      "status": "pending",
      "signing_order": 1
    },
    {
      "id": "signer_2",
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "role": "buyer",
      "status": "pending",
      "signing_order": 2
    }
  ]
}
```

### Start Signing Process

```http
POST /api/documents/{id}/start-signing
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "sk_id_solutions",  // Optional, uses tenant default
  "send_invitations": true,       // Optional, default true
  "callback_url": "https://app.example.com/webhooks/signing"  // Optional
}
```

**Response 200:**
```json
{
  "signature_request": {
    "id": "sig_req_abc",
    "document_id": "doc_xyz789",
    "provider": "sk_id_solutions",
    "provider_request_id": "skid_session_123",
    "status": "in_progress",
    "created_at": "2025-01-15T10:45:00Z"
  },
  "signers": [
    {
      "id": "signer_1",
      "name": "John Doe",
      "email": "john@mycompany.com",
      "role": "seller",
      "status": "invited",
      "signing_url": "https://app.example.com/documents/sign/token_abc123"
    },
    {
      "id": "signer_2",
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "role": "buyer",
      "status": "invited",
      "signing_url": "https://app.example.com/documents/sign/token_def456"
    }
  ]
}
```

### Public Signing Page

```http
GET /documents/sign/{token}
```

No authentication required. Returns HTML signing interface.

**Response 200:** HTML page with:
- Document preview (embedded PDF)
- Signer information
- Signing method buttons (Smart-ID, Mobile-ID, etc.)
- Status updates

### Submit Signature

```http
POST /api/sign
Content-Type: application/json

{
  "token": "token_abc123",
  "method": "smartid",
  "phone": "+37212345678",    // Required for Smart-ID/Mobile-ID
  "personal_code": "37001010001"  // Required for Smart-ID/Mobile-ID
}
```

**Response 200:**
```json
{
  "success": true,
  "all_signed": false,
  "message": "Signature recorded. Waiting for other signers.",
  "remaining_signers": 1
}
```

**Response 200 (all signed):**
```json
{
  "success": true,
  "all_signed": true,
  "message": "Document fully signed!",
  "signed_pdf_url": "https://storage.example.com/documents/tenant_xyz/doc_xyz789/signed.pdf"
}
```

## Webhooks

### Payment Webhook

```http
POST /webhooks/payments
Content-Type: application/json
X-Signature: <provider-signature>

{
  "provider": "stripe",
  "event_type": "payment_intent.succeeded",
  "event_id": "evt_1234567890",
  "invoice_id": "inv_abc123",
  "amount": 1270.00,
  "currency": "EUR",
  "payment_reference": "pi_1234567890",
  "metadata": {
    "customer_email": "billing@acme.com"
  }
}
```

**Response 200:**
```json
{
  "webhook_id": "webhook_xyz",
  "processed": true,
  "invoice_id": "inv_abc123",
  "new_status": "paid"
}
```

### Signing Webhook

```http
POST /webhooks/signing
Content-Type: application/json
X-Signature: <provider-signature>

{
  "provider": "sk_id_solutions",
  "event_type": "signer.signed",
  "session_id": "skid_session_123",
  "signer_id": "signer_1",
  "status": "signed",
  "signed_at": "2025-01-15T11:00:00Z",
  "signature_value": "base64_signature_data",
  "certificate": "base64_certificate_data"
}
```

**Response 200:**
```json
{
  "webhook_id": "webhook_abc",
  "processed": true,
  "document_id": "doc_xyz789",
  "all_signed": false
}
```

### Email Bounce Webhook

```http
POST /webhooks/email
Content-Type: application/json
X-Signature: <provider-signature>

{
  "provider": "sendgrid",
  "event_type": "bounce",
  "message_id": "msg_123456",
  "email": "bounced@example.com",
  "reason": "Mailbox full",
  "timestamp": "2025-01-15T10:40:00Z"
}
```

**Response 200:**
```json
{
  "webhook_id": "webhook_def",
  "processed": true,
  "email_log_updated": true
}
```

## Admin Endpoints

### List Tenants

```http
GET /api/tenants
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "tenants": [
    {
      "id": "tenant_xyz",
      "name": "My Company Ltd",
      "role": "owner",
      "is_active": true
    }
  ]
}
```

### Get Audit Logs

```http
GET /api/audit-logs?entity_type=invoice&entity_id=inv_abc123
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "logs": [
    {
      "id": "audit_1",
      "actor": {
        "user_id": "user_123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "action": "create",
      "entity_type": "invoice",
      "entity_id": "inv_abc123",
      "changes": {
        "after": {...}
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": "audit_2",
      "actor": {...},
      "action": "send",
      "entity_type": "invoice",
      "entity_id": "inv_abc123",
      "metadata": {
        "recipient": "billing@acme.com"
      },
      "created_at": "2025-01-15T10:35:00Z"
    }
  ],
  "total": 2,
  "page": 1
}
```

### List Email Templates

```http
GET /api/email-templates
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "templates": [
    {
      "id": "tmpl_1",
      "template_key": "invoice_sent",
      "name": "Invoice Sent",
      "subject": "Invoice {{invoice_number}} from {{seller_name}}",
      "variables": ["invoice_number", "seller_name", "buyer_name", "total", "due_date"],
      "is_active": true,
      "is_system": false
    }
  ]
}
```

### Update Email Template

```http
PUT /api/email-templates/{key}
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Invoice {{invoice_number}} - Payment Due",
  "body_html": "<html>...</html>",
  "body_text": "Plain text version..."
}
```

**Response 200:**
```json
{
  "template": {...},
  "message": "Template updated successfully"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (e.g., duplicate send) |
| 422 | VALIDATION_ERROR | Validation failed |
| 429 | RATE_LIMIT | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

Rate limits are applied per tenant:

- **Free tier**: 100 requests/minute
- **Paid tier**: 1000 requests/minute
- **Enterprise**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642345678
```

## Pagination

List endpoints support pagination:

```http
GET /api/invoices?page=1&per_page=20&sort_by=created_at&sort_order=desc
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## Filtering

Common filters:

```http
GET /api/invoices?status=sent&from_date=2025-01-01&to_date=2025-01-31
GET /api/invoices?buyer_email=acme@example.com
GET /api/invoices?search=web+development
```

## Webhooks Best Practices

### 1. Verify Signatures

Always verify webhook signatures before processing:

```typescript
const signature = request.headers.get('X-Signature');
const isValid = verifySignature(payload, signature, webhookSecret);
if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}
```

### 2. Idempotency

Handle duplicate webhooks gracefully:

```typescript
const existing = await db.query(
  'SELECT * FROM payment_webhooks WHERE event_id = ?',
  [payload.event_id]
);
if (existing) {
  return new Response('Already processed', { status: 200 });
}
```

### 3. Async Processing

Return 200 immediately, process asynchronously:

```typescript
// Queue for background processing
await queue.send({ webhook: payload });

// Return success immediately
return new Response('Accepted', { status: 200 });
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { InvoicingClient } from '@yourcompany/invoicing-sdk';

const client = new InvoicingClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://invoicing-production.your-workers.dev'
});

// Create invoice
const invoice = await client.invoices.create({
  buyer_name: 'Acme Corp',
  buyer_email: 'billing@acme.com',
  items: [
    { description: 'Service', quantity: 1, unit_price: 100, vat_percent: 22 }
  ]
});

// Generate PDF
await client.invoices.generatePDF(invoice.id, { mode: 'final' });

// Send email
await client.invoices.sendEmail(invoice.id);
```

### cURL

```bash
# Create invoice
curl -X POST https://invoicing-production.your-workers.dev/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_name": "Acme Corp",
    "buyer_email": "billing@acme.com",
    "items": [{"description": "Service", "quantity": 1, "unit_price": 100, "vat_percent": 22}]
  }'
```

## Support

- **API Status**: https://status.example.com
- **Documentation**: https://docs.example.com
- **Support Email**: support@example.com
- **Developer Discord**: https://discord.gg/example

---

**API Version**: 1.0.0  
**Last Updated**: 2025-12-25
