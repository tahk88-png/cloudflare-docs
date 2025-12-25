# Rentbox.ee Checkout Signing & Consent Implementation

This document describes the Signing & Consent block implementation for Rentbox.ee checkout flow, tailored for 24/7 self-service tool rental via smart lockers.

## Overview

The implementation provides a complete signing and consent system that:
- Shows terms and conditions with Estonian text
- Requires two mandatory consents
- Supports typed e-signature (default) and strong digital signatures (Smart-ID/Mobiil-ID/ID-kaart)
- Automatically requires strong signatures for orders ≥250 EUR, >72 hours, or B2B
- Gates payment until consents are accepted and signature is complete
- Validates terms version locking

## File Structure

```
migrations/
  001_create_terms_versions.sql      # Database schema for terms versions
  002_create_checkout_consents.sql   # Database schema for checkout consents

src/
  lib/
    db/
      types.ts                        # TypeScript types for database entities
      queries.ts                      # Database query functions
    signing/
      policy.ts                       # Signing policy evaluation logic
    checkout/
      payment-gating.ts               # Payment gating validation logic
    utils.ts                          # Utility functions (cn for className)

  components/
    ui/
      button.tsx                      # Button component
      checkbox.tsx                    # Checkbox component
      input.tsx                       # Input component
      radio-group.tsx                 # Radio group component
    checkout/
      SigningConsent.tsx              # Main signing & consent component

  pages/
    api/
      terms/
        active.ts                     # GET /api/terms/active
      checkout/
        [cart_id]/
          consent.ts                  # POST /api/checkout/:cart_id/consent
          sign/
            typed.ts                  # POST /api/checkout/:cart_id/sign/typed
            digital/
              start.ts                # POST /api/checkout/:cart_id/sign/digital/start
              status.ts               # POST /api/checkout/:cart_id/sign/digital/status
      cart/
        [cart_id]/
          checkout.ts                 # POST /api/cart/:cart_id/checkout
          confirm-payment.ts          # POST /api/cart/:cart_id/confirm-payment
    checkout/
      [cart_id].astro                 # Checkout page
```

## Database Schema

### terms_versions
Stores different versions of terms and conditions.

```sql
CREATE TABLE terms_versions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### checkout_consents
Stores consent and signature data for each checkout.

```sql
CREATE TABLE checkout_consents (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  terms_version_id TEXT NOT NULL,
  consent_1 BOOLEAN DEFAULT FALSE,
  consent_2 BOOLEAN DEFAULT FALSE,
  signature_method TEXT, -- 'typed', 'smartid', 'mobileid', 'idcard'
  signer_name TEXT,
  signer_identifier_masked TEXT,
  signed_at TEXT,
  ip TEXT,
  user_agent TEXT,
  contract_hash TEXT NOT NULL,
  signature_ref TEXT, -- ASiC-E / provider reference
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'verified'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

### GET /api/terms/active
Returns the currently active terms version.

**Response:**
```json
{
  "id": "uuid",
  "title": "Rentbox.ee tööriistade renditingimused",
  "content_hash": "abc123...",
  "url": "https://...",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### POST /api/checkout/:cart_id/consent
Updates consent checkboxes.

**Request:**
```json
{
  "consent_1": true,
  "consent_2": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "cart_id": "cart123",
  "consent_1": true,
  "consent_2": true,
  "status": "pending",
  ...
}
```

### POST /api/checkout/:cart_id/sign/typed
Submits typed e-signature.

**Request:**
```json
{
  "signer_name": "Jaan Tamm"
}
```

**Response:**
```json
{
  "id": "uuid",
  "signature_method": "typed",
  "signer_name": "Jaan Tamm",
  "signed_at": "2024-01-01T00:00:00Z",
  "status": "signed",
  ...
}
```

### POST /api/checkout/:cart_id/sign/digital/start
Starts digital signature session.

**Request:**
```json
{
  "method": "smartid" // or "mobileid" or "idcard"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "method": "smartid",
  "status": "pending",
  "message": "Ootan kinnitust…"
}
```

### POST /api/checkout/:cart_id/sign/digital/status
Checks digital signature status (polling endpoint).

**Request:**
```json
{
  "session_id": "uuid",
  "signature_ref": "ref_...",
  "signer_identifier_masked": "****1234",
  "signer_name": "Jaan Tamm"
}
```

**Response:**
```json
{
  "status": "verified", // or "pending"
  "consent": { ... },
  "message": "Allkiri kinnitatud"
}
```

### POST /api/cart/:cart_id/checkout
Validates that checkout can proceed (payment gating).

**Response:**
```json
{
  "success": true,
  "cart_id": "cart123",
  "consent_id": "uuid",
  "message": "Ready for payment"
}
```

### POST /api/cart/:cart_id/confirm-payment
Confirms payment completion and creates booking.

**Request:**
```json
{
  "payment_id": "pay_123",
  "payment_status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "booking_id": "uuid",
  "locker_access_code": "1234-5678",
  "message": "Broneering loodud. Ligipääsukood saadetud SMS-iga."
}
```

## Signing Policy

The system automatically determines signature requirements:

**Typed e-signature (default):**
- Used for standard consumer rentals
- Amount < 250 EUR
- Duration ≤ 72 hours
- B2C customers

**Strong digital signature (required when):**
- Amount ≥ 250 EUR
- OR duration > 72 hours
- OR B2B customer

Supported methods:
- Smart-ID
- Mobiil-ID
- ID-kaart

## Component Usage

```tsx
import { SigningConsent } from '~/components/checkout/SigningConsent';

<SigningConsent
  cartId="cart123"
  cartInfo={{
    cart_id: "cart123",
    total_amount: 150,
    rental_duration_hours: 48,
    is_b2b: false,
    customer_email: "customer@example.com",
    customer_phone: "+372 12345678"
  }}
  onSigningComplete={(consent) => {
    // Enable payment button
    console.log('Signed:', consent);
  }}
/>
```

## Payment Gating

The "Maksa" (Pay) button is enabled ONLY when:
1. Both consents are checked (`consent_1` and `consent_2`)
2. Signature is complete (`status === 'signed'` or `status === 'verified'`)
3. Terms version matches active version
4. Contract hash is valid
5. Signature method matches policy (strong signature if required)

## Terms Version Locking

If terms change after a user has signed:
- The signature is invalidated
- User must review and sign again
- Contract hash is recomputed
- Payment is blocked until re-signing

## Estonian Text

All user-facing text is in Estonian:

- **Title:** "Rentbox.ee tööriistade renditingimused"
- **Consent 1:** "Kinnitan, et olen tutvunud Rentbox.ee renditingimustega ja nõustun nendega."
- **Consent 2:** "Nõustun, et rendiperioodi ületamisel rakendub hilinemistasu ning vastutan tööriista kahjustumise või kadumise eest."
- **Status messages:**
  - "Ootan kinnitust…" (Waiting for confirmation)
  - "Allkiri kinnitatud" (Signature confirmed)
  - "Allkirjastamine ebaõnnestus" (Signing failed)

## Setup Instructions

1. **Create D1 Database:**
   ```bash
   wrangler d1 create rentbox-db
   ```

2. **Run Migrations:**
   ```bash
   wrangler d1 execute rentbox-db --file=./migrations/001_create_terms_versions.sql
   wrangler d1 execute rentbox-db --file=./migrations/002_create_checkout_consents.sql
   ```

3. **Add D1 Binding to wrangler.toml:**
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "rentbox-db"
   database_id = "your-database-id"
   ```

4. **Insert Initial Terms Version:**
   ```sql
   INSERT INTO terms_versions (id, title, content_hash, url, is_active)
   VALUES (
     'v1',
     'Rentbox.ee tööriistade renditingimused',
     'abc123hash',
     'https://rentbox.ee/terms.pdf',
     TRUE
   );
   ```

5. **Integrate eID Providers:**
   - Update `/api/checkout/:cart_id/sign/digital/start.ts` to call actual Smart-ID/Mobiil-ID/ID-kaart APIs
   - Update `/api/checkout/:cart_id/sign/digital/status.ts` to verify signatures with providers

## Testing

Test the flow:

1. Navigate to `/checkout/[cart_id]`
2. Check both consent boxes
3. Enter name and sign (or use digital signature if required)
4. Verify payment button is enabled
5. Complete payment flow

## Notes

- Digital signature integration is mocked - replace with actual eID provider APIs
- Contract hash computation uses base64 encoding - consider using crypto.subtle.digest in production
- Payment flow is simplified - integrate with actual payment provider
- Terms PDF URL should point to actual terms document
- IP address capture uses Cloudflare's `cf-connecting-ip` header
