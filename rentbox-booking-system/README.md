# Rentbox Booking System

A complete **Booking Cart & Checkout system** for a 24/7 self-service tool rental platform.

This is a time-based booking system with locker logic - **not e-commerce**. It handles:
- Cart items as rentals with time ranges (not quantities)
- Soft locking of compartments during cart lifetime
- Transaction-safe availability checks
- Dynamic pricing with multiple rules
- Rental extensions

## 🏗️ Architecture

```
rentbox-booking-system/
├── backend/                 # Express.js API
│   ├── migrations/          # PostgreSQL migrations
│   ├── src/
│   │   ├── api/            # Route handlers
│   │   ├── db/             # Database connection & utilities
│   │   ├── middleware/     # Error handling, rate limiting
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript definitions
│   └── package.json
├── frontend/               # React + TypeScript
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript definitions
│   └── package.json
└── package.json            # Root package (workspaces)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Stripe account (for payments)

### Installation

1. **Clone and install dependencies:**
```bash
cd rentbox-booking-system
npm install
```

2. **Set up the database:**
```bash
# Create PostgreSQL database
createdb rentbox

# Run migrations
npm run db:migrate

# Seed with demo data
npm run db:seed
```

3. **Configure environment:**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit with your Stripe keys and database credentials

# Frontend
cp frontend/.env.example frontend/.env
# Edit with your Stripe publishable key
```

4. **Start development servers:**
```bash
npm run dev
```

This starts:
- Backend API at http://localhost:3001
- Frontend at http://localhost:3000

## 📦 Core Features

### Cart System
- **TTL-based carts** - 15-minute expiration with automatic cleanup
- **Soft locking** - Compartments reserved while in cart
- **Real-time validation** - Price recalculation on validate
- **Multi-item support** - Up to 10 items per cart

### Availability & Locking
- **Soft locks** - Temporary reservation during cart lifetime
- **Hard protection** - Database exclusion constraints prevent double-booking
- **Automatic release** - Locks released on cart expiry/payment failure

### Pricing Engine (Lukku)
- Base price per hour/day (optimally combined)
- Peak hours multiplier (weekday mornings/evenings)
- Weekend multiplier
- Long rental discounts (3+ days)
- Custom pricing rules from database

### Checkout Flow
1. Validate cart (recalculate prices, check availability)
2. Lock cart for checkout
3. Acquire checkout locks (extended TTL)
4. Create Stripe payment intent
5. Process payment
6. Webhook confirms payment → Create bookings
7. Release locks, assign compartments

### Rental Extensions
- Check same-compartment availability
- Calculate additional cost
- Create extension payment intent
- Update booking on payment success

## 📡 API Endpoints

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cart` | Create new cart |
| GET | `/api/cart/:id` | Get cart by ID |
| POST | `/api/cart/:id/items` | Add item to cart |
| PUT | `/api/cart/:id/items/:item_id` | Update cart item |
| DELETE | `/api/cart/:id/items/:item_id` | Remove cart item |
| POST | `/api/cart/:id/validate` | Validate cart |

### Checkout
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cart/:id/checkout` | Initiate checkout |
| POST | `/api/cart/:id/confirm-payment` | Confirm payment |
| POST | `/api/payments/webhook` | Stripe webhook |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/:id` | Get booking |
| GET | `/api/bookings/user/:user_id` | Get user bookings |
| POST | `/api/bookings/:id/pickup` | Mark picked up |
| POST | `/api/bookings/:id/return` | Mark returned |
| POST | `/api/bookings/:id/extend` | Extend rental |
| POST | `/api/bookings/:id/cancel` | Cancel booking |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/carts` | List all carts |
| GET | `/api/admin/bookings` | List all bookings |
| POST | `/api/admin/carts/:id/recover` | Recover stuck cart |
| POST | `/api/admin/bookings/:id/force-release` | Force release booking |
| GET | `/api/admin/lockers/:id/timeline` | Get locker timeline |
| POST | `/api/admin/maintenance/cleanup` | Run cleanup tasks |

## 🗄️ Database Schema

### Core Tables

```sql
-- Carts with TTL
CREATE TABLE carts (
    id UUID PRIMARY KEY,
    user_id UUID,
    status cart_status,  -- active, locked, completed, expired
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

-- Cart items with time ranges
CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID REFERENCES carts,
    product_id UUID REFERENCES products,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10, 2),
    deposit DECIMAL(10, 2),
    price_breakdown JSONB
);

-- Soft locks on compartments
CREATE TABLE cart_locks (
    id UUID PRIMARY KEY,
    cart_id UUID REFERENCES carts,
    compartment_id UUID REFERENCES compartments,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    -- Exclusion constraint prevents overlapping locks
    CONSTRAINT no_overlap_locks EXCLUDE USING gist (...)
);

-- Confirmed bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products,
    compartment_id UUID REFERENCES compartments,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    status booking_status,
    total_price DECIMAL(10, 2),
    pickup_code VARCHAR(10),
    -- Exclusion constraint prevents overlapping bookings
    CONSTRAINT no_overlap_bookings EXCLUDE USING gist (...)
);
```

## 💰 Pricing Example

```json
{
  "base_price": 45.00,
  "hours": 0,
  "days": 3,
  "hourly_rate": 3.50,
  "daily_rate": 15.00,
  "subtotal": 38.25,
  "adjustments": [
    {
      "name": "Weekend Rate",
      "type": "multiplier",
      "value": 1.15,
      "amount": 6.75,
      "description": "Weekend rental surcharge"
    },
    {
      "name": "Long Rental Discount",
      "type": "multiplier",
      "value": 0.95,
      "amount": -2.25,
      "description": "5% discount for 3+ day rental"
    }
  ],
  "deposit": 50.00,
  "total": 92.00,
  "currency": "EUR"
}
```

## 🛡️ Security Features

- **Rate limiting** - Cart creation, checkout attempts
- **Idempotent checkout** - Prevents duplicate charges
- **Server-side validation** - Never trust client pricing
- **Advisory locks** - Prevent race conditions
- **Webhook signature verification** - Secure payment confirmation
- **Audit logging** - Track all important actions

## 🔧 Error Handling

The system handles:
- Availability lost mid-cart
- Cart expiry during payment
- Payment success but booking failure (rollback)
- Duplicate webhook events
- Manual admin recovery

## 📱 Frontend Components

- `CartView` - Main cart page with items and summary
- `CartItemCard` - Individual cart item with price breakdown
- `CountdownTimer` - Cart expiry countdown
- `TimeRangeEditor` - Modal for editing rental times
- `PriceBreakdown` - Detailed pricing display
- `StickyCheckoutCTA` - Mobile checkout button
- `CheckoutView` - Payment form with Stripe Elements
- `CheckoutSuccess` - Confirmation with pickup codes

## 🚦 Cart States

| Status | Description |
|--------|-------------|
| `active` | Cart is active, can be modified |
| `locked` | Cart locked for checkout |
| `completed` | Checkout completed successfully |
| `expired` | Cart expired due to TTL |
| `abandoned` | Cart was abandoned |

## 📊 Admin Dashboard Features

- Active carts with expiry timers
- Failed/stuck cart recovery
- Bookings timeline per locker
- Manual unlock/reassignment
- Payment status audit
- System statistics

## 🏃 Running in Production

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up Stripe webhook endpoint
4. Configure CORS for your domain
5. Set up SSL/TLS
6. Configure proper logging
7. Set up monitoring and alerts

## 📄 License

MIT

---

Built for **Rentbox.ee** - 24/7 Self-Service Tool Rental Platform
