# Rentbox.ee - Booking Cart & Checkout System

A robust, transaction-safe booking system for a 24/7 self-service tool rental platform.

## Architecture

- **Backend**: Node.js / Next.js API Routes (Simulated)
- **Database**: PostgreSQL with `uuid-ossp` and `GIST` indexes for range locking.
- **Frontend**: React + Tailwind + TypeScript.
- **Payment**: Stripe Integration (Mocked).

## Core Features

1.  **Soft Locking**: Compartments are temporarily locked when added to cart using `cart_locks` table.
2.  **Hard Consistency**: Database exclusion constraints prevent overlapping bookings or locks on the same compartment.
3.  **Dynamic Pricing**: Custom engine handling weekends, peak hours, and long-term discounts.
4.  **Extend Rental**: Logic to extend an active booking, checking specifically for the same compartment's availability.

## Database Schema

The database relies on 6 main tables:
- `carts`: User sessions.
- `cart_items`: Items in the cart (time ranges).
- `cart_locks`: Temporary reservations on compartments.
- `bookings`: Final confirmed reservations.
- `products` / `compartments`: Inventory.
- `payments`: Transaction records.

See `database/schema.sql` for the full definition.

## Setup Instructions

1.  **Database Setup**:
    Run the migrations in your PostgreSQL instance:
    ```bash
    psql -d rentbox -f database/schema.sql
    psql -d rentbox -f database/seed.sql
    ```

2.  **Environment Variables**:
    Configure your `.env` (example):
    ```
    DATABASE_URL=postgres://user:pass@localhost:5432/rentbox
    STRIPE_SECRET_KEY=sk_test_...
    ```

3.  **Run Application**:
    This repository contains the source code structure. Integrate into a Next.js or Express app.
    - API Handlers: `src/api/`
    - Logic/Lib: `src/lib/`
    - Components: `src/components/`

## Key Logic Files

- `src/lib/availability.ts`: Handles the complex availability checking using SQL range queries.
- `src/lib/pricing.ts`: Calculates costs based on business rules.
- `src/api/checkout.ts`: Manages the transaction of converting a cart to a booking.

## API Endpoints

- `POST /api/cart`: Create new cart.
- `POST /api/cart/:id/items`: Add item (locks compartment).
- `POST /api/cart/:id/checkout`: Validate and get payment intent.
- `POST /api/payments/webhook`: Handle Stripe success and convert locks to bookings.
