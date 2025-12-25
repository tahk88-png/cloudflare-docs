-- Booking Cart & Checkout System Database Schema
-- Rentbox.ee - 24/7 Self-Service Tool Rental Platform
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table (tools/equipment)
CREATE TABLE IF NOT EXISTS products (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name VARCHAR(255) NOT NULL,
	description TEXT,
	base_price_per_hour INTEGER NOT NULL, -- In cents
	base_price_per_day INTEGER NOT NULL, -- In cents
	deposit_amount INTEGER NOT NULL, -- In cents
	locker_id UUID NOT NULL,
	total_compartments INTEGER NOT NULL DEFAULT 1,
	peak_hours_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
	weekend_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
	long_rental_discount_threshold_hours INTEGER NOT NULL DEFAULT 24,
	long_rental_discount_percent INTEGER NOT NULL DEFAULT 0,
	peak_hours_start TIME NOT NULL DEFAULT '17:00',
	peak_hours_end TIME NOT NULL DEFAULT '22:00',
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Compartments (locker slots)
CREATE TABLE IF NOT EXISTS compartments (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	locker_id UUID NOT NULL,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	compartment_number VARCHAR(50) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	UNIQUE(locker_id, compartment_number)
);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID, -- Nullable for guest carts
	status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'expired', 'completed', 'abandoned')),
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_status ON carts(status);
CREATE INDEX idx_carts_expires_at ON carts(expires_at);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	start_at TIMESTAMP WITH TIME ZONE NOT NULL,
	end_at TIMESTAMP WITH TIME ZONE NOT NULL,
	price INTEGER NOT NULL, -- Calculated price in cents
	deposit INTEGER NOT NULL, -- Deposit amount in cents
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	CHECK (end_at > start_at)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_time_range ON cart_items USING GIST (tstzrange(start_at, end_at));

-- Cart locks (soft locking for availability)
CREATE TABLE IF NOT EXISTS cart_locks (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
	compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE CASCADE,
	start_at TIMESTAMP WITH TIME ZONE NOT NULL,
	end_at TIMESTAMP WITH TIME ZONE NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	CHECK (end_at > start_at)
);

CREATE INDEX idx_cart_locks_cart_id ON cart_locks(cart_id);
CREATE INDEX idx_cart_locks_product_id ON cart_locks(product_id);
CREATE INDEX idx_cart_locks_compartment_id ON cart_locks(compartment_id);
CREATE INDEX idx_cart_locks_expires_at ON cart_locks(expires_at);
CREATE INDEX idx_cart_locks_time_range ON cart_locks USING GIST (tstzrange(start_at, end_at));

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL,
	product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
	compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE RESTRICT,
	start_at TIMESTAMP WITH TIME ZONE NOT NULL,
	end_at TIMESTAMP WITH TIME ZONE NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
	total_price INTEGER NOT NULL, -- Total price in cents
	deposit INTEGER NOT NULL, -- Deposit amount in cents
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	CHECK (end_at > start_at)
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_product_id ON bookings(product_id);
CREATE INDEX idx_bookings_compartment_id ON bookings(compartment_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time_range ON bookings USING GIST (tstzrange(start_at, end_at));

-- Unique constraint: prevent double-booking of same compartment
CREATE UNIQUE INDEX idx_bookings_compartment_time_unique ON bookings(compartment_id, start_at, end_at)
WHERE status IN ('pending', 'confirmed', 'active');

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	cart_id UUID REFERENCES carts(id) ON DELETE SET NULL,
	booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
	provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'bank_transfer')),
	intent_id VARCHAR(255) NOT NULL, -- Stripe PaymentIntent ID or equivalent
	status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
	amount INTEGER NOT NULL, -- Amount in cents
	currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
	created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_cart_id ON payments(cart_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_intent_id ON payments(intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired carts and locks
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void AS $$
BEGIN
	-- Mark expired carts
	UPDATE carts
	SET status = 'expired'
	WHERE status = 'active' AND expires_at < NOW();
	
	-- Delete expired locks (they're automatically released)
	DELETE FROM cart_locks
	WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check compartment availability
CREATE OR REPLACE FUNCTION check_compartment_availability(
	p_product_id UUID,
	p_start_at TIMESTAMP WITH TIME ZONE,
	p_end_at TIMESTAMP WITH TIME ZONE,
	p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
	compartment_id UUID,
	compartment_number VARCHAR,
	is_available BOOLEAN
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		c.id AS compartment_id,
		c.compartment_number,
		NOT EXISTS (
			SELECT 1
			FROM bookings b
			WHERE b.compartment_id = c.id
				AND b.status IN ('pending', 'confirmed', 'active')
				AND (b.id != p_exclude_booking_id OR p_exclude_booking_id IS NULL)
				AND tstzrange(b.start_at, b.end_at) && tstzrange(p_start_at, p_end_at)
		) AS is_available
	FROM compartments c
	WHERE c.product_id = p_product_id
		AND c.is_active = true
	ORDER BY c.compartment_number;
END;
$$ LANGUAGE plpgsql;
