# Payment Integration

## Stripe Integration

The payment system uses Stripe for processing payments. The implementation includes:

### Payment Flow

1. **Create Payment Intent** (`POST /api/payments/create-intent`)
   - Validates consent and signature
   - Creates Stripe Payment Intent
   - Returns client secret for frontend

2. **Confirm Payment** (`POST /api/payments/confirm`)
   - Confirms payment with Stripe
   - Updates payment status in database
   - Creates booking and generates locker access code

3. **Webhook Handler** (`POST /api/payments/webhook`)
   - Handles Stripe webhook events
   - Updates payment status asynchronously
   - Creates booking on successful payment

### Environment Variables

Required environment variables:
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (frontend)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Setup

1. Install Stripe SDK (when ready for production):
```bash
npm install stripe @stripe/stripe-js
```

2. Add to `wrangler.toml`:
```toml
[vars]
STRIPE_SECRET_KEY = "sk_test_..."
STRIPE_PUBLISHABLE_KEY = "pk_test_..."

[[secrets]]
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

3. Configure webhook in Stripe Dashboard:
   - Endpoint: `https://your-domain.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Payment Status Flow

```
pending → processing → succeeded
                    → failed
```

- `pending`: Payment intent created, awaiting payment
- `processing`: Payment being processed
- `succeeded`: Payment successful, booking created
- `failed`: Payment failed

### Database Fields

Payment-related fields in `checkout_consents`:
- `payment_intent_id` - Stripe Payment Intent ID
- `payment_status` - Current payment status
- `payment_amount` - Amount in cents
- `payment_currency` - Currency code (EUR)
- `payment_method` - Payment method used
- `payment_completed_at` - Timestamp of completion

### Booking Creation

On successful payment:
1. Generate unique booking ID
2. Generate locker access code (8 digits, format: XXXX-XXXX)
3. Save booking to database
4. Send access code via SMS/email
5. Return confirmation to user
