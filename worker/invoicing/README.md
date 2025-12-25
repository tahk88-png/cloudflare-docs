# Invoicing system (Worker module)

This repo’s Worker (`worker/index.ts`) now also serves an **invoicing API** under:

- `/api/*` (authenticated API)
- `/invoice-view/{token}` (time-limited customer view link)
- `/webhooks/payments` (payments webhook)

The docs site behavior for non-API routes is unchanged.

## Core guarantees

- **Per-tenant invoice numbering**: `YYYY-000001` sequence, unique per tenant and year.
- **Immutable final PDF**: on send request we generate a **FINAL** PDF, store it in R2, and persist:
  - `pdf_url`
  - `pdf_sha256`
  - `pdf_r2_key`
- **Two PDF modes**:
  - **DRAFT**: watermark (via `POST /api/invoices/{id}/generate-pdf`)
  - **FINAL**: no watermark (generated automatically during `POST /api/invoices/{id}/send-email`)
- **Email delivery states**: `queued | sending | sent | bounced | failed` with retries and exponential backoff.
- **Customer view link**: time-limited token, logs `viewed_at`, `ip`, `user_agent`.
- **Payments**: optional `payment_url` transitions `sent → payment_pending → paid` via webhook.
- **Reminders**: configurable per invoice and per customer; each reminder send is logged.
- **No edits after sending**: only `draft` invoices can be updated; after send you must use a **credit note** (`type: "credit"`).
- **Multi-tenant RBAC**: `owner | admin | accountant | viewer` plus a full `audit_logs` trail.

## Storage / bindings

Configured in `wrangler.toml`:

- `INVOICING_DB` (D1)
- `INVOICE_PDFS` (R2)

## Bootstrap (create first tenant/user/API key)

`POST /api/bootstrap` (requires `X-Bootstrap-Token: <BOOTSTRAP_TOKEN>`):

```json
{
  "tenant_name": "Acme LLC",
  "user_email": "owner@acme.example",
  "user_name": "Owner"
}
```

Response includes a **tenant_id** and **api_key**.

## Auth model

All `/api/*` endpoints require:

- `Authorization: Bearer <api_key>`
- `X-Tenant-Id: <tenant_id>`

## Required endpoints

- `POST /api/invoices`
- `PUT /api/invoices/{id}` (draft only)
- `POST /api/invoices/{id}/generate-pdf` (draft PDF, watermark)
- `POST /api/invoices/{id}/send-email` (finalize PDF + queue email)
- `GET /api/invoices/{id}`
- `GET /invoice-view/{token}`
- `POST /webhooks/payments`

## Payments webhook

If `PAYMENT_WEBHOOK_SECRET` is set, requests must include:

- `X-Webhook-Signature: <hex(hmac_sha256(secret, rawBody))>`

Payload:

```json
{
  "tenant_id": "…",
  "provider": "stripe",
  "status": "paid",
  "invoice_id": "…",
  "event_id": "evt_…"
}
```

