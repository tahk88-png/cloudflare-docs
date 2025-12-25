# Rentbox.ee - Booking Cart & Checkout System

A complete, production-ready booking cart and checkout system for 24/7 self-service tool rental platform.

## 🎯 Key Features

- **Time-Based Booking** - Not e-commerce; rentals with time ranges
- **Smart Availability** - Real-time compartment availability checking
- **Soft Locking** - Reserve compartments during cart lifetime
- **Dynamic Pricing** - Peak hours, weekends, long rental discounts
- **Secure Checkout** - Stripe integration with webhook handling
- **Extend Rentals** - Extend active bookings with availability checks
- **Admin Tools** - Complete dashboard for monitoring and management
- **Mobile-First UI** - Responsive design with Tailwind CSS

## 🏗️ Architecture

### Backend (Node.js + TypeScript + PostgreSQL)

```
backend/
├── src/
│   ├── db/
│   │   ├── schema.sql          # Complete database schema
│   │   ├── connection.ts       # PostgreSQL connection pool
│   │   ├── migrate.ts          # Migration runner
│   │   └── seeds/              # Seed data
│   ├── services/
│   │   ├── availability.ts     # Availability checking logic
│   │   ├── locking.ts          # Soft locking system
│   │   ├── pricing.ts          # Dynamic pricing engine
│   │   ├── cart.ts             # Cart management
│   │   ├── booking.ts          # Booking lifecycle
│   │   └── payment.ts          # Stripe integration
│   ├── api/
│   │   ├── cart.ts             # Cart endpoints
│   │   ├── checkout.ts         # Checkout flow
│   │   ├── bookings.ts         # Booking management
│   │   ├── payments.ts         # Payment webhooks
│   │   └── admin.ts            # Admin endpoints
│   ├── middleware/             # Express middleware
│   ├── types/                  # TypeScript types
│   └── index.ts                # Server entry point
```

### Frontend (React + TypeScript + Tailwind)

```
frontend/
├── src/
│   ├── components/
│   │   ├── cart/               # Cart UI components
│   │   ├── checkout/           # Checkout flow
│   │   ├── admin/              # Admin dashboard
│   │   └── shared/             # Reusable components
│   ├── services/
│   │   └── api.ts              # API client
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helper functions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)

### 1. Database Setup

```bash
# Create database
createdb rentbox

# Set environment variables
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm install
npm run migrate

# Seed sample data
npm run seed
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server runs on http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## 📊 Database Schema

### Core Tables

- **carts** - Temporary shopping carts with TTL
- **cart_items** - Rental items in cart with time ranges
- **cart_locks** - Soft locks on compartments
- **bookings** - Confirmed rentals after payment
- **payments** - Payment transactions via Stripe
- **products** - Available tools for rent
- **compartments** - Physical storage units
- **product_compartments** - Product-compartment mapping
- **pricing_rules** - Dynamic pricing rules

### Key Constraints

- Cart TTL: 15 minutes (configurable)
- Locks expire with cart
- Unique constraint on bookings per compartment (prevents overlaps)
- Transaction-safe booking creation

## 🔐 API Endpoints

### Cart Management

```http
POST   /api/cart                       # Create new cart
GET    /api/cart/:id                   # Get cart with items
POST   /api/cart/:id/items             # Add item to cart
PUT    /api/cart/:id/items/:item_id    # Update cart item
DELETE /api/cart/:id/items/:item_id    # Remove item from cart
POST   /api/cart/:id/validate          # Validate cart availability
```

### Checkout Flow

```http
POST   /api/cart/:id/checkout          # Initiate checkout
POST   /api/cart/:id/confirm-payment   # Confirm payment success
```

### Bookings

```http
GET    /api/bookings/:id                      # Get booking details
POST   /api/bookings/:id/extend               # Extend booking
POST   /api/bookings/:id/cancel               # Cancel booking
POST   /api/bookings/:id/complete             # Complete booking
GET    /api/bookings/user/:user_id            # Get user bookings
```

### Payments

```http
POST   /api/payments/webhook            # Stripe webhook handler
GET    /api/payments/:id                # Get payment details
```

### Admin

```http
GET    /api/admin/carts                        # List all carts
GET    /api/admin/carts/:id                    # Get cart details
POST   /api/admin/carts/:id/recover            # Recover stuck cart
GET    /api/admin/bookings                     # List bookings
GET    /api/admin/bookings/timeline/:id        # Compartment timeline
POST   /api/admin/bookings/:id/force-release   # Force release booking
GET    /api/admin/stats                        # System statistics
POST   /api/admin/cleanup                      # Manual cleanup
```

## 💰 Pricing Engine

The pricing engine supports:

- **Base Pricing** - Hourly and daily rates
- **Peak Hours** - Multiplier for busy times
- **Weekend Pricing** - Higher rates on weekends
- **Duration Discounts** - Discounts for 3+ and 7+ day rentals
- **Seasonal Pricing** - Custom rules for seasons

Example pricing breakdown:

```json
{
  "base_price": 25.00,
  "hours": 48,
  "days": 2,
  "hourly_rate": 5.00,
  "daily_rate": 25.00,
  "subtotal": 50.00,
  "adjustments": [
    {
      "type": "multiplier",
      "name": "Weekend Multiplier",
      "amount": 6.50,
      "percentage": 30,
      "applied_to": 50.00
    }
  ],
  "total": 56.50,
  "deposit": 50.00,
  "currency": "EUR"
}
```

## 🔒 Locking System

### Soft Locks

When a user adds an item to their cart:

1. System checks availability
2. Finds best available compartment
3. Creates soft lock (expires with cart)
4. Lock prevents others from booking same compartment

### Lock Release

Locks are automatically released when:
- Cart expires (TTL reached)
- Item removed from cart
- Payment fails
- Cart converted to bookings

### Hard Protection

Final booking creation runs in a database transaction with:
- Overlap prevention via unique index
- Atomic compartment assignment
- Rollback on any failure

## 🎨 Frontend Components

### Cart UI

- **CountdownTimer** - Real-time cart expiry countdown
- **CartItemCard** - Item display with time range and pricing
- **PriceBreakdown** - Detailed pricing explanation
- **CartSummary** - Order totals
- **CartView** - Main cart interface

### Checkout

- **CheckoutView** - Complete checkout flow
- Stripe Elements integration
- Secure payment processing
- Email confirmation

### Admin

- **AdminDashboard** - System overview
- **BookingsList** - Manage all bookings
- Real-time statistics
- Manual intervention tools

## 📱 Mobile-First Design

- Sticky bottom CTA on mobile
- One-thumb operation
- Clear visual states
- Touch-friendly controls
- Responsive grid layouts

## 🛡️ Error Handling

The system gracefully handles:

- **Availability lost mid-cart** - Clear error messages
- **Cart expiry during payment** - Cart unlocked, payment canceled
- **Payment success but booking failure** - Automatic rollback
- **Duplicate webhook events** - Idempotency checks
- **Network failures** - Retry logic

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rentbox
DATABASE_POOL_SIZE=20

# Server
PORT=3000
NODE_ENV=development

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_test_...

# Cart Configuration
CART_TTL_MINUTES=15
CART_LOCK_TTL_MINUTES=15
MAX_CART_ITEMS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=http://localhost:5173
```

## 🧪 Testing

### Manual Testing Flow

1. Create a cart: `POST /api/cart`
2. Add items: `POST /api/cart/:id/items`
3. Validate cart: `POST /api/cart/:id/validate`
4. Checkout: `POST /api/cart/:id/checkout`
5. Complete payment in Stripe
6. Webhook creates bookings automatically

### Test Stripe Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## 📈 Monitoring

### Built-in Cleanup

The system runs automatic cleanup every 5 minutes:
- Expires old carts
- Releases expired locks
- Updates cart statuses

### Admin Dashboard

Real-time metrics:
- Active carts
- Active bookings
- Revenue
- System health

## 🚨 Security

- ✅ Input validation with Zod
- ✅ Rate limiting
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Webhook signature verification
- ✅ Server-side pricing validation
- ✅ Transaction-safe operations

## 🎯 Production Checklist

- [ ] Set up PostgreSQL with connection pooling
- [ ] Configure Stripe webhook endpoint
- [ ] Set up environment variables
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure logging (e.g., Winston, Sentry)
- [ ] Set up monitoring (e.g., Datadog, New Relic)
- [ ] Load test the system
- [ ] Set up CI/CD pipeline

## 📝 Example JSON

See `/examples` directory for:
- Cart response examples
- Booking examples
- Pricing breakdown examples
- Error response examples

## 🤝 Contributing

This is a production-ready system. For modifications:

1. Never trust client-side pricing
2. Always validate availability server-side
3. Use transactions for critical operations
4. Test edge cases thoroughly
5. Monitor lock cleanup

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

For issues or questions:
- Check the API documentation
- Review error responses
- Check admin dashboard for system state
- Review database logs

---

Built with ❤️ for Rentbox.ee - Making tool rental accessible 24/7
