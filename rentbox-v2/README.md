# Rentbox v2: Unified Discounts, Vouchers & Campaigns System

A production-ready, accounting-grade system for managing promotional discounts, monetary vouchers/gift cards, and campaign rules for Rentbox v2.

## 🎯 Core Features

- **Discount Codes**: Percentage, fixed amount, or free time bonuses
- **Vouchers / Gift Cards**: Real money balances with partial redemption
- **Campaign Rule Engine**: Time, location, product, user, and booking rules
- **Gift Card Sales Flow**: Public purchase flow with email delivery
- **Accounting Integration**: Liability tracking and revenue recognition
- **Security**: Rate limiting, row-level locking, audit trails

## 📋 Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Core Components](#core-components)
- [API Endpoints](#api-endpoints)
- [Integration Guide](#integration-guide)
- [Accounting](#accounting)
- [Security](#security)

## 🏗️ Architecture

```
rentbox-v2/
├── database/
│   └── migrations/
│       └── 001_create_discounts_vouchers_campaigns.sql
├── src/
│   ├── types/              # TypeScript types & interfaces
│   ├── core/               # Business logic
│   │   ├── campaign-engine.ts    # Rule evaluation
│   │   ├── checkout.ts           # Code application
│   │   ├── redemption.ts         # Post-payment recording
│   │   ├── gift-cards.ts         # Purchase flow
│   │   └── accounting.ts         # Liability & reports
│   ├── api/                # HTTP handlers
│   │   ├── checkout.ts
│   │   ├── gift-cards.ts
│   │   ├── admin.ts
│   │   └── reports.ts
│   ├── db/                 # Database adapters
│   │   └── postgres-adapter.ts
│   └── utils/
│       └── security.ts
└── docs/
    ├── API_EXAMPLES.md
    └── EDGE_CASES.md
```

## 🗄️ Database Schema

### Core Tables

- `discount_codes` - Promotional discount codes
- `campaigns` - Rule sets for discounts
- `discount_campaigns` - Many-to-many junction
- `vouchers` - Gift cards with monetary balance
- `voucher_redemptions` - Redemption audit trail
- `discount_redemptions` - Discount usage audit trail
- `gift_card_purchases` - Purchase records (accounting)
- `user_discount_usage` - Per-user limit tracking
- `admin_audit_log` - Admin action logging

See `database/migrations/001_create_discounts_vouchers_campaigns.sql` for full schema.

## 🔧 Core Components

### Campaign Rule Engine

Evaluates campaign rules against booking context:

```typescript
import { evaluateCampaignRules } from './core/campaign-engine';

const result = evaluateCampaignRules(campaign.rules, {
  cart: { subtotal: 5000, locker_id: 'locker_123', ... },
  user_id: 'user_abc',
  booking_context: { is_first_time: false, is_b2b: false }
});

if (!result.valid) {
  console.log(result.reason); // "Campaign only valid on weekends"
}
```

### Checkout Integration

Apply codes before payment:

```typescript
import { applyCode } from './core/checkout';

const result = await applyCode({
  code: 'SUMMER2024',
  cart: { subtotal: 5000, deposit: 2000, ... },
  user_id: 'user_abc'
}, db);

if (result.success && result.discount) {
  console.log(`Discount: €${result.discount.discount_amount / 100}`);
}
```

### Redemption Recording

Record after successful payment:

```typescript
import { recordRedemptions } from './core/redemption';

await recordRedemptions({
  bookingId: 'booking_xyz',
  userId: 'user_abc',
  appliedDiscount: { id: 'disc_123', amount: 500 },
  appliedVoucher: { id: 'vouch_456', amount: 2000 },
  bookingSubtotal: 5000,
  bookingDurationMinutes: 120
}, db);
```

## 🌐 API Endpoints

### Checkout

- `POST /api/checkout/apply-code` - Apply discount/voucher code
- `POST /api/checkout/remove-code` - Remove code from cart

### Gift Cards

- `POST /api/gift-cards/purchase` - Purchase gift card
- `GET /api/vouchers/:code` - Check voucher balance

### Admin

- `POST /api/admin/discounts` - Create discount
- `PATCH /api/admin/discounts/:id` - Update discount
- `POST /api/admin/campaigns` - Create campaign
- `POST /api/admin/vouchers` - Create voucher manually
- `PATCH /api/admin/vouchers/:id` - Update voucher

### Reports

- `GET /api/admin/reports/voucher-liability` - Liability report
- `GET /api/admin/reports/discount-usage` - Discount usage report

See `docs/API_EXAMPLES.md` for detailed request/response examples.

## 🔌 Integration Guide

### 1. Database Setup

Run migrations:

```bash
psql -d rentbox_db -f database/migrations/001_create_discounts_vouchers_campaigns.sql
```

### 2. Database Adapter

Implement or use the provided PostgreSQL adapter:

```typescript
import { PostgresDatabaseAdapter } from './db/postgres-adapter';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PostgresDatabaseAdapter(pool);
```

### 3. Checkout Flow Integration

```typescript
// 1. User enters code in UI
const result = await fetch('/api/checkout/apply-code', {
  method: 'POST',
  body: JSON.stringify({
    code: 'SUMMER2024',
    cart: { subtotal: 5000, deposit: 2000, ... }
  })
});

// 2. Show preview to user
if (result.data.success) {
  updateCartTotal(result.data.discount.new_total);
}

// 3. On payment success, record redemption
await fetch('/api/checkout/confirm', {
  method: 'POST',
  body: JSON.stringify({
    bookingId: 'booking_xyz',
    appliedCode: { type: 'discount', id: 'disc_123', amount: 500 }
  })
});
```

### 4. Payment Webhook

```typescript
// Handle successful payment
if (paymentIntent.status === 'succeeded') {
  await recordRedemptions({
    bookingId: booking.id,
    userId: booking.user_id,
    appliedDiscount: booking.applied_discount,
    appliedVoucher: booking.applied_voucher,
    bookingSubtotal: booking.subtotal,
    bookingDurationMinutes: booking.duration_minutes
  }, db);
}
```

### 5. Gift Card Purchase Flow

```typescript
// 1. User selects amount and pays
const purchase = await fetch('/api/gift-cards/purchase', {
  method: 'POST',
  body: JSON.stringify({
    amount: 5000, // €50.00
    recipient_email: 'recipient@example.com',
    gift_message: 'Happy Birthday!'
  })
});

// 2. Frontend processes payment with client_secret
stripe.confirmCardPayment(purchase.data.client_secret, ...);

// 3. Webhook sends email on success
// POST /api/webhooks/gift-card-payment-success
```

## 💰 Accounting

### Gift Card Sale

When a gift card is sold:

```
Debit:  Cash/Bank                    €50.00
Credit: Unearned Revenue - Gift Cards  €50.00
```

### Voucher Redemption

When a voucher is redeemed:

```
Debit:  Unearned Revenue - Gift Cards  €30.00
Credit: Rental Revenue                €30.00
```

### Liability Report

```typescript
import { generateVoucherLiabilityReport } from './core/accounting';

const report = await generateVoucherLiabilityReport(db);
console.log(`Outstanding liability: €${report.total_outstanding_liability / 100}`);
```

## 🔒 Security

### Rate Limiting

```typescript
import { InMemoryRateLimiter } from './utils/security';

const rateLimiter = new InMemoryRateLimiter(10, 60000); // 10 req/min
const allowed = await rateLimiter.checkLimit(`apply-code:${userId}`);
```

### Row-Level Locking

Voucher redemptions use `SELECT ... FOR UPDATE` to prevent double-spending:

```typescript
const voucher = await db.lockVoucherForUpdate(voucherId);
if (voucher.remaining_amount < amount) {
  throw new Error('Insufficient balance');
}
```

### Audit Logging

All admin actions are logged:

```typescript
await auditLog.log('voucher_disable', 'voucher', voucherId, {
  before: { is_active: true },
  after: { is_active: false }
});
```

## 📊 Campaign Rules Examples

### Weekend Only

```json
{
  "time": {
    "weekdays": [0, 6]
  }
}
```

### Helsinki Locations, Min €30

```json
{
  "location": {
    "cities": ["Helsinki"]
  },
  "booking": {
    "min_order_value": 3000
  }
}
```

### First-Time Customers Only

```json
{
  "user": {
    "first_time_only": true
  }
}
```

### Business Hours Only

```json
{
  "time": {
    "time_windows": [
      {
        "start": "09:00",
        "end": "17:00",
        "timezone": "Europe/Helsinki"
      }
    ]
  }
}
```

## 🧪 Testing

Example test structure:

```typescript
describe('Campaign Engine', () => {
  it('should reject outside time window', () => {
    const rules = {
      time: {
        time_windows: [{ start: '09:00', end: '17:00' }]
      }
    };
    const result = evaluateCampaignRules(rules, {
      cart: {},
      current_time: new Date('2024-01-01T20:00:00Z')
    });
    expect(result.valid).toBe(false);
  });
});
```

## 📝 Notes

- All monetary values stored in **cents** (integers)
- Codes are **case-insensitive** (normalized to uppercase)
- Voucher balance deducted **only after payment confirmation**
- Discounts apply to **rental subtotal only** (deposit excluded)
- Campaign rules evaluated **server-side only**
- Full **audit trail** for all redemptions

## 🚀 Deployment

1. Run database migrations
2. Configure environment variables:
   - `DATABASE_URL`
   - `PAYMENT_PROVIDER_SECRET_KEY`
   - `EMAIL_SERVICE_API_KEY`
3. Deploy API endpoints (Cloudflare Workers, Express, etc.)
4. Set up payment webhooks
5. Configure admin authentication

## 📚 Additional Documentation

- [API Examples](./docs/API_EXAMPLES.md) - Request/response examples
- [Edge Cases](./docs/EDGE_CASES.md) - Handling edge cases

## ⚠️ Important Considerations

1. **Real Money**: Vouchers represent real money. Always use transactions and row-level locking.
2. **Accounting Compliance**: Gift card sales create liabilities. Ensure proper accounting integration.
3. **Expiry Policies**: Check local regulations for gift card expiry rules.
4. **Breakage Income**: Expired vouchers may be recognized as income (consult accountant).
5. **Tax Handling**: Discounts may affect tax calculations (implement tax logic separately).

## 📄 License

[Your License Here]
