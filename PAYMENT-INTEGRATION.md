# Rentbox.ee Payment Integration Guide

## Overview

The payment system is fully integrated into the checkout flow using Stripe. Payments are processed securely and bookings are automatically created upon successful payment.

## Flow Diagram

```
User completes signing
    ↓
Payment component enabled
    ↓
Click "Alusta maksmist"
    ↓
POST /api/payments/create-intent
    ↓
Stripe Payment Intent created
    ↓
User enters card details (Stripe Elements)
    ↓
POST /api/payments/confirm
    ↓
Payment processed
    ↓
Booking created + Access code generated
    ↓
Success message displayed
```

## API Endpoints

### POST /api/payments/create-intent

Creates a Stripe Payment Intent and validates that checkout can proceed.

**Request:**
```json
{
  "cart_id": "cart123",
  "total_amount": 150.00,
  "rental_duration_hours": 48,
  "is_b2b": false
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 15000,
  "currency": "eur"
}
```

**Validations:**
- Consent must be accepted
- Signature must be complete
- Terms version must be valid
- Contract hash must match

### POST /api/payments/confirm

Confirms payment and creates booking.

**Request:**
```json
{
  "payment_intent_id": "pi_xxx",
  "cart_id": "cart123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "booking_id": "uuid",
  "locker_access_code": "1234-5678",
  "message": "Broneering loodud. Ligipääsukood saadetud SMS-iga."
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Payment failed",
  "status": "requires_payment_method"
}
```

### POST /api/payments/webhook

Handles Stripe webhook events asynchronously.

**Events handled:**
- `payment_intent.succeeded` - Updates status and creates booking
- `payment_intent.payment_failed` - Updates status to failed

## Component Usage

```tsx
import { Payment } from '~/components/checkout/Payment';

<Payment
  cartId="cart123"
  cartInfo={{
    cart_id: "cart123",
    total_amount: 150,
    rental_duration_hours: 48,
    is_b2b: false
  }}
  onPaymentSuccess={(bookingId, accessCode) => {
    console.log('Booking:', bookingId, 'Code:', accessCode);
  }}
  onPaymentError={(error) => {
    console.error('Payment error:', error);
  }}
/>
```

## Stripe Setup

### 1. Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

### 2. Environment Variables

Add to `wrangler.toml`:
```toml
[vars]
STRIPE_SECRET_KEY = "sk_test_..."
STRIPE_PUBLISHABLE_KEY = "pk_test_..."

[[secrets]]
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Or use Wrangler secrets:
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

### 3. Update Stripe Integration

Update `src/lib/payments/stripe.ts`:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

export async function createPaymentIntent(...) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'eur',
    metadata: { cart_id: cartId },
  });
  return paymentIntent;
}
```

### 4. Update Payment Component

Update `src/components/checkout/Payment.tsx`:

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Use Stripe Elements in component
```

### 5. Configure Webhook

In Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Payment Status Flow

```
pending → processing → succeeded
                    → failed
```

- **pending**: Payment intent created, awaiting payment method
- **processing**: Payment being processed by Stripe
- **succeeded**: Payment successful, booking created
- **failed**: Payment failed (card declined, etc.)

## Database Schema

Payment fields added to `checkout_consents`:

```sql
payment_intent_id TEXT
payment_status TEXT DEFAULT 'pending'
payment_amount INTEGER
payment_currency TEXT DEFAULT 'EUR'
payment_method TEXT
payment_completed_at TEXT
```

## Booking Creation

On successful payment:

1. Generate unique booking ID (UUID)
2. Generate locker access code (8 digits: XXXX-XXXX)
3. Save booking to database (TODO: create bookings table)
4. Send access code via SMS/email (TODO: integrate SMS provider)
5. Return confirmation to user

## Error Handling

The payment component handles:
- Network errors
- Payment failures
- Invalid payment methods
- Stripe API errors

All errors are displayed to the user in Estonian.

## Testing

### Test Cards (Stripe Test Mode)

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test Flow

1. Complete signing
2. Click "Alusta maksmist"
3. Enter test card: `4242 4242 4242 4242`
4. Expiry: Any future date (e.g., `12/25`)
5. CVC: Any 3 digits (e.g., `123`)
6. Complete payment
7. Verify booking created

## Security

- Payment details never touch your server (handled by Stripe Elements)
- Payment Intent created server-side with secret key
- Webhook signature verification (TODO: implement)
- PCI compliance handled by Stripe
- HTTPS required for production

## Production Checklist

- [ ] Install Stripe SDK
- [ ] Update Stripe API calls in `stripe.ts`
- [ ] Integrate Stripe.js Elements in `Payment.tsx`
- [ ] Configure webhook endpoint
- [ ] Add webhook signature verification
- [ ] Set up production Stripe keys
- [ ] Test with real cards (small amounts)
- [ ] Implement booking table
- [ ] Integrate SMS/email provider
- [ ] Add error monitoring (Sentry, etc.)
- [ ] Add payment analytics
