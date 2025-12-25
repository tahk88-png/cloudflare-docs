# Booking Cart & Checkout System

Complete booking cart and checkout system for Rentbox.ee - a 24/7 self-service tool rental platform.

## Features

- ✅ Time-based booking (not quantity-based)
- ✅ Soft locking system to prevent double-booking
- ✅ Dynamic pricing engine (peak hours, weekends, discounts)
- ✅ Cart expiration and TTL management
- ✅ Payment integration (Stripe)
- ✅ Extend rental functionality
- ✅ Admin dashboard and recovery tools
- ✅ Mobile-first responsive UI
- ✅ Transaction-safe availability checks

## Database Setup

### 1. Install PostgreSQL

Ensure PostgreSQL is installed and running.

### 2. Install Dependencies

```bash
npm install pg @types/pg
```

### 3. Set Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/rentbox
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Run Migrations

```bash
# Connect to PostgreSQL and run schema.sql
psql -U postgres -d rentbox -f src/lib/booking/db/schema.sql

# Run seed data (optional)
psql -U postgres -d rentbox -f src/lib/booking/db/migrations/002_seed_data.sql
```

## API Endpoints

### Cart Management

- `POST /api/cart` - Create a new cart
- `GET /api/cart/:id` - Get cart details
- `POST /api/cart/:id/items` - Add item to cart
- `PUT /api/cart/:id/items/:itemId` - Update cart item
- `DELETE /api/cart/:id/items/:itemId` - Remove cart item
- `POST /api/cart/:id/validate` - Validate cart before checkout

### Checkout & Payments

- `POST /api/cart/:id/checkout` - Initiate checkout
- `POST /api/cart/:id/confirm-payment` - Confirm payment after Stripe redirect
- `POST /api/payments/webhook` - Stripe webhook handler

### Bookings

- `POST /api/bookings/:id/extend` - Extend rental period

### Admin

- `GET /api/admin/carts` - List all carts
- `GET /api/admin/bookings` - List all bookings
- `POST /api/admin/carts/:id/recover` - Recover stuck cart
- `POST /api/admin/bookings/:id/force-release` - Force release booking

## Usage Example

### Create Cart and Add Item

```typescript
// Create cart
const cartResponse = await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'user-123' }),
});
const { cart } = await cartResponse.json();

// Add item
const itemResponse = await fetch(`/api/cart/${cart.id}/items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 'product-123',
    start_at: '2024-01-15T10:00:00Z',
    end_at: '2024-01-15T14:00:00Z',
  }),
});
```

### Checkout Flow

```typescript
// 1. Validate cart
const validateResponse = await fetch(`/api/cart/${cartId}/validate`, {
  method: 'POST',
});

// 2. Create checkout
const checkoutResponse = await fetch(`/api/cart/${cartId}/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-123',
    return_url: 'https://example.com/success',
  }),
});

// 3. Redirect to Stripe payment
// After payment, Stripe redirects back to return_url

// 4. Confirm payment (webhook handles this automatically)
```

## React Components

### CartView

Main cart component that displays all items and handles cart operations.

```tsx
import { CartView } from '~/components/booking/CartView';

<CartView 
  cartId="cart-123" 
  onCheckout={() => navigate('/checkout')} 
/>
```

### CountdownTimer

Displays time remaining until cart expiry.

```tsx
import { CountdownTimer } from '~/components/booking/CountdownTimer';

<CountdownTimer 
  expiresAt={cart.expires_at} 
  onExpire={() => handleExpiry()} 
/>
```

### TimeRangeEditor

Edit start and end times for a rental.

```tsx
import { TimeRangeEditor } from '~/components/booking/TimeRangeEditor';

<TimeRangeEditor
  startAt={item.start_at}
  endAt={item.end_at}
  onChange={(start, end) => handleUpdate(start, end)}
/>
```

## Pricing Engine

The pricing engine calculates dynamic prices based on:

- Base hourly/daily rate
- Peak hours multiplier (configurable hours)
- Weekend multiplier
- Long rental discount (after threshold hours)

Example configuration:

```typescript
const product = {
  base_price_per_hour: 500, // €5.00
  base_price_per_day: 5000, // €50.00
  deposit_amount: 10000, // €100.00
  peak_hours_multiplier: 1.5, // 50% increase
  weekend_multiplier: 1.2, // 20% increase
  long_rental_discount_threshold_hours: 24,
  long_rental_discount_percent: 10,
  peak_hours_start: '17:00',
  peak_hours_end: '22:00',
};
```

## Availability & Locking

### Soft Locking

When an item is added to cart:
1. Availability is checked
2. A compartment is reserved via `cart_locks`
3. Lock expires after 15 minutes (configurable)

### Hard Protection

- Final booking creation runs in database transaction
- Unique constraint prevents overlap per compartment
- Availability checked again before booking creation

## Security Considerations

- ✅ Idempotent checkout (prevents duplicate charges)
- ✅ Rate limiting on cart creation (implement in middleware)
- ✅ Server-side time validation
- ✅ Server-side pricing calculation (never trust client)
- ✅ Webhook signature verification (implement in production)
- ✅ Admin authentication (implement in production)

## Error Handling

The system handles:

- Availability lost mid-cart → Validation error
- Cart expiry during payment → Payment fails, locks released
- Payment success but booking failure → Rollback transaction
- Duplicate webhook events → Idempotent processing
- Manual admin recovery → Admin endpoints

## Admin Tools

### Recover Stuck Cart

If a cart gets stuck in "locked" status:

```bash
POST /api/admin/carts/:id/recover
```

This releases locks and resets cart status.

### Force Release Booking

Cancel a booking and release the compartment:

```bash
POST /api/admin/bookings/:id/force-release
Body: { "reason": "Customer request" }
```

## Production Checklist

- [ ] Configure Stripe webhook endpoint
- [ ] Set up webhook signature verification
- [ ] Implement admin authentication
- [ ] Set up database connection pooling
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure automatic lock cleanup (cron job)
- [ ] Set up error logging
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS

## Database Maintenance

### Cleanup Expired Locks

Run periodically (e.g., every 5 minutes):

```sql
SELECT cleanup_expired_carts();
```

Or via cron:

```bash
psql -U postgres -d rentbox -c "SELECT cleanup_expired_carts();"
```

## License

MIT
