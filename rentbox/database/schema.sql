-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Carts Table
-- Holds the temporary session state for a user's booking attempt.
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Nullable for guest checkout
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, locked, converted, abandoned
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products / Compartments (Implicitly needed for bookings, simplified for this schema)
-- Assuming a 'products' table exists or is defined elsewhere, but for completeness:
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price_per_hour DECIMAL(10, 2) NOT NULL,
    metadata JSONB
);

CREATE TABLE compartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    locker_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'available' -- available, maintenance
);

-- 3. Cart Items
-- Represents the user's desired rental (e.g., "I want a drill from 10am to 2pm")
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    price DECIMAL(10, 2) NOT NULL, -- Calculated price snapshot
    deposit DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Cart Locks (Soft Locking)
-- Reserves a specific compartment for a cart item to prevent double booking during checkout.
CREATE TABLE cart_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    compartment_id UUID REFERENCES compartments(id),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Should match or slightly exceed cart expiry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no overlapping locks for the same compartment
    EXCLUDE USING GIST (
        compartment_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    )
);

-- 5. Bookings
-- The final confirmed reservation.
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Link to user
    product_id UUID REFERENCES products(id),
    compartment_id UUID REFERENCES compartments(id),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- confirmed, active, completed, cancelled
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Hard constraint: Prevent overlapping bookings for the same compartment
    EXCLUDE USING GIST (
        compartment_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    )
);

-- 6. Payments
-- Tracks payment intents and statuses.
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id),
    booking_id UUID REFERENCES bookings(id), -- Nullable, filled after conversion
    provider VARCHAR(50) NOT NULL, -- e.g., 'stripe'
    intent_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_carts_expires_at ON carts(expires_at);
CREATE INDEX idx_cart_locks_expires_at ON cart_locks(expires_at);
CREATE INDEX idx_bookings_range ON bookings USING GIST (tstzrange(start_at, end_at));
CREATE INDEX idx_cart_locks_range ON cart_locks USING GIST (tstzrange(start_at, end_at));
