-- ═══════════════════════════════════════════════════════════════════════════
-- RENTBOX BOOKING SYSTEM - DATABASE SCHEMA
-- Initial migration for booking cart and checkout system
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTS TABLE
-- Tools available for rental
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Pricing
    base_price_per_hour DECIMAL(10, 2) NOT NULL,
    base_price_per_day DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Metadata
    image_url VARCHAR(500),
    specifications JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- LOCKERS TABLE
-- Physical locker units containing compartments
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE lockers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    address TEXT,
    
    -- Coordinates for map display
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Operating hours (JSON for flexibility)
    operating_hours JSONB DEFAULT '{"24_7": true}',
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPARTMENTS TABLE
-- Individual compartments within lockers that hold products
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE compartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locker_id UUID NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    compartment_number VARCHAR(20) NOT NULL,
    size VARCHAR(50) DEFAULT 'standard', -- small, standard, large
    
    -- Hardware integration
    hardware_id VARCHAR(100), -- Physical lock ID
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(locker_id, compartment_number)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CARTS TABLE
-- Shopping carts with TTL-based expiry
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TYPE cart_status AS ENUM (
    'active',           -- Cart is active and can be modified
    'locked',           -- Cart is locked for checkout
    'completed',        -- Checkout completed successfully
    'expired',          -- Cart expired due to TTL
    'abandoned'         -- Cart was abandoned
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Nullable for guest checkout
    
    status cart_status DEFAULT 'active',
    
    -- TTL management (default 15 minutes)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Session tracking
    session_id VARCHAR(255),
    
    -- Checkout metadata
    checkout_started_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding expired carts
CREATE INDEX idx_carts_expires_at ON carts(expires_at) WHERE status = 'active';
CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session_id ON carts(session_id) WHERE session_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- CART ITEMS TABLE
-- Individual rental items in a cart
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Rental time range
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Calculated pricing (recalculated on validate)
    price DECIMAL(10, 2) NOT NULL,
    deposit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Price breakdown stored as JSON for display
    price_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate product in same cart
    UNIQUE(cart_id, product_id),
    
    -- Ensure valid time range
    CONSTRAINT valid_time_range CHECK (end_at > start_at)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- CART LOCKS TABLE
-- Soft locks on compartments during cart lifetime
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE cart_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    cart_item_id UUID NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    compartment_id UUID NOT NULL REFERENCES compartments(id),
    
    -- Locked time range
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Lock expiry (matches cart expiry)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent overlapping locks on same compartment
    CONSTRAINT no_overlap_locks EXCLUDE USING gist (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (expires_at > NOW())
);

CREATE INDEX idx_cart_locks_cart_id ON cart_locks(cart_id);
CREATE INDEX idx_cart_locks_compartment_id ON cart_locks(compartment_id);
CREATE INDEX idx_cart_locks_expires_at ON cart_locks(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- BOOKINGS TABLE
-- Confirmed rentals (created after successful payment)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TYPE booking_status AS ENUM (
    'confirmed',        -- Payment confirmed, ready for pickup
    'active',           -- Tool has been picked up
    'completed',        -- Tool returned successfully
    'extended',         -- Rental was extended
    'overdue',          -- Past end_at but not returned
    'cancelled'         -- Booking was cancelled
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    cart_id UUID REFERENCES carts(id),
    
    product_id UUID NOT NULL REFERENCES products(id),
    compartment_id UUID NOT NULL REFERENCES compartments(id),
    
    -- Rental time range
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    original_end_at TIMESTAMP WITH TIME ZONE, -- Preserved if extended
    
    status booking_status DEFAULT 'confirmed',
    
    -- Pricing
    total_price DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deposit_refunded BOOLEAN DEFAULT false,
    
    -- Price breakdown
    price_breakdown JSONB DEFAULT '{}',
    
    -- Pickup/Return codes
    pickup_code VARCHAR(10),
    return_code VARCHAR(10),
    
    -- Timestamps
    picked_up_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    
    -- Extension tracking
    extension_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure valid time range
    CONSTRAINT valid_booking_time_range CHECK (end_at > start_at)
);

-- Prevent overlapping bookings on same compartment (hard protection)
CREATE INDEX idx_bookings_compartment_time ON bookings(compartment_id, start_at, end_at);
CREATE INDEX idx_bookings_user_id ON bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bookings_status ON bookings(status);

-- Exclusion constraint for no overlapping confirmed/active bookings
ALTER TABLE bookings ADD CONSTRAINT no_overlap_bookings EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status IN ('confirmed', 'active', 'extended'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENTS TABLE
-- Payment tracking and webhook handling
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TYPE payment_status AS ENUM (
    'pending',          -- Payment intent created
    'processing',       -- Payment is being processed
    'succeeded',        -- Payment successful
    'failed',           -- Payment failed
    'cancelled',        -- Payment cancelled
    'refunded',         -- Payment was refunded
    'partially_refunded' -- Partial refund issued
);

CREATE TYPE payment_type AS ENUM (
    'checkout',         -- Initial checkout payment
    'extension',        -- Rental extension payment
    'deposit',          -- Deposit payment
    'penalty'           -- Late return penalty
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id),
    booking_id UUID REFERENCES bookings(id),
    
    -- Payment provider info
    provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    intent_id VARCHAR(255) NOT NULL,
    
    -- Payment details
    type payment_type DEFAULT 'checkout',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    status payment_status DEFAULT 'pending',
    
    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE,
    
    -- Provider metadata
    provider_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_cart_id ON payments(cart_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_intent_id ON payments(intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRICING RULES TABLE
-- Dynamic pricing configuration
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Rule type
    rule_type VARCHAR(50) NOT NULL, -- 'peak_hours', 'weekend', 'long_rental', 'category'
    
    -- Conditions (JSON for flexibility)
    conditions JSONB NOT NULL DEFAULT '{}',
    
    -- Multiplier or fixed adjustment
    multiplier DECIMAL(5, 3) DEFAULT 1.0,
    fixed_adjustment DECIMAL(10, 2) DEFAULT 0,
    
    -- Priority (higher = applied first)
    priority INTEGER DEFAULT 0,
    
    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- Track important actions for debugging and compliance
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Who did it
    user_id UUID,
    admin_id UUID,
    
    -- Details
    details JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS AND TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compartments_updated_at BEFORE UPDATE ON compartments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired cart locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM cart_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark expired carts
CREATE OR REPLACE FUNCTION mark_expired_carts()
RETURNS void AS $$
BEGIN
    UPDATE carts 
    SET status = 'expired' 
    WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check compartment availability
CREATE OR REPLACE FUNCTION check_compartment_availability(
    p_compartment_id UUID,
    p_start_at TIMESTAMP WITH TIME ZONE,
    p_end_at TIMESTAMP WITH TIME ZONE,
    p_exclude_cart_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_conflict BOOLEAN;
BEGIN
    -- Check for conflicting bookings
    SELECT EXISTS (
        SELECT 1 FROM bookings
        WHERE compartment_id = p_compartment_id
        AND status IN ('confirmed', 'active', 'extended')
        AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    ) INTO has_conflict;
    
    IF has_conflict THEN
        RETURN FALSE;
    END IF;
    
    -- Check for conflicting locks (excluding current cart)
    SELECT EXISTS (
        SELECT 1 FROM cart_locks
        WHERE compartment_id = p_compartment_id
        AND expires_at > NOW()
        AND (p_exclude_cart_id IS NULL OR cart_id != p_exclude_cart_id)
        AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    ) INTO has_conflict;
    
    RETURN NOT has_conflict;
END;
$$ LANGUAGE plpgsql;

-- Function to find available compartment for a product
CREATE OR REPLACE FUNCTION find_available_compartment(
    p_product_id UUID,
    p_start_at TIMESTAMP WITH TIME ZONE,
    p_end_at TIMESTAMP WITH TIME ZONE,
    p_exclude_cart_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_compartment_id UUID;
BEGIN
    SELECT c.id INTO v_compartment_id
    FROM compartments c
    WHERE c.product_id = p_product_id
    AND c.is_active = true
    AND check_compartment_availability(c.id, p_start_at, p_end_at, p_exclude_cart_id)
    LIMIT 1;
    
    RETURN v_compartment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate random pickup/return code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
