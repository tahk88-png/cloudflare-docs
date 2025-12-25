-- Rentbox.ee Database Schema
-- Time-based booking system with compartment locking

-- Products (tools available for rent)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  base_price_hourly DECIMAL(10, 2) NOT NULL,
  base_price_daily DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compartments (physical storage units in lockers)
CREATE TABLE IF NOT EXISTS compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id VARCHAR(100) NOT NULL,
  compartment_number INTEGER NOT NULL,
  size VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(locker_id, compartment_number)
);

-- Product-Compartment mapping (which products can go in which compartments)
CREATE TABLE IF NOT EXISTS product_compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  compartment_id UUID NOT NULL REFERENCES compartments(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, compartment_id)
);

-- Carts (temporary shopping carts with TTL)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carts_expires_at ON carts(expires_at) WHERE status = 'active';
CREATE INDEX idx_carts_status ON carts(status);
CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;

-- Cart Items (rental items in cart with time ranges)
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  deposit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pricing_breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_at > start_at)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_time_range ON cart_items(start_at, end_at);

-- Cart Locks (soft locks on compartments during cart lifetime)
CREATE TABLE IF NOT EXISTS cart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  cart_item_id UUID NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_lock_time_range CHECK (end_at > start_at)
);

CREATE INDEX idx_cart_locks_cart_id ON cart_locks(cart_id);
CREATE INDEX idx_cart_locks_compartment_time ON cart_locks(compartment_id, start_at, end_at);
CREATE INDEX idx_cart_locks_expires_at ON cart_locks(expires_at);

-- Bookings (confirmed rentals after payment)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id),
  product_id UUID NOT NULL REFERENCES products(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  user_id VARCHAR(255),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  total_price DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pricing_breakdown JSONB NOT NULL,
  pickup_code VARCHAR(100),
  return_code VARCHAR(100),
  extended_from UUID REFERENCES bookings(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_booking_time_range CHECK (end_at > start_at)
);

CREATE INDEX idx_bookings_product_id ON bookings(product_id);
CREATE INDEX idx_bookings_compartment_time ON bookings(compartment_id, start_at, end_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bookings_time_range ON bookings(start_at, end_at);

-- Prevent overlapping bookings on same compartment
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings(compartment_id, start_at, end_at) 
WHERE status IN ('confirmed', 'active', 'in_progress');

-- Payments (payment transactions via Stripe)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id),
  booking_ids UUID[],
  provider VARCHAR(50) DEFAULT 'stripe',
  intent_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method_types TEXT[],
  metadata JSONB DEFAULT '{}',
  webhook_events JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_cart_id ON payments(cart_id);
CREATE INDEX idx_payments_intent_id ON payments(intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Pricing Rules (for dynamic pricing engine)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  multiplier DECIMAL(5, 2),
  discount_percentage DECIMAL(5, 2),
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_active ON pricing_rules(active, priority);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type);

-- Audit Log (for security and debugging)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
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

-- Function to clean up expired carts and locks
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void AS $$
BEGIN
  -- Delete expired cart locks
  DELETE FROM cart_locks WHERE expires_at < NOW();
  
  -- Update expired carts to 'expired' status
  UPDATE carts 
  SET status = 'expired' 
  WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check compartment availability
CREATE OR REPLACE FUNCTION check_compartment_availability(
  p_product_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_cart_id UUID DEFAULT NULL
)
RETURNS TABLE(compartment_id UUID, locker_id VARCHAR, compartment_number INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pc.compartment_id, c.locker_id, c.compartment_number
  FROM product_compartments pc
  JOIN compartments c ON c.id = pc.compartment_id
  WHERE pc.product_id = p_product_id
    AND c.status = 'active'
    AND pc.compartment_id NOT IN (
      -- Exclude compartments with confirmed bookings
      SELECT b.compartment_id
      FROM bookings b
      WHERE b.compartment_id = pc.compartment_id
        AND b.status IN ('confirmed', 'active', 'in_progress')
        AND (
          (b.start_at, b.end_at) OVERLAPS (p_start_at, p_end_at)
        )
      UNION
      -- Exclude compartments with active cart locks (except current cart)
      SELECT cl.compartment_id
      FROM cart_locks cl
      JOIN carts cart ON cart.id = cl.cart_id
      WHERE cl.compartment_id = pc.compartment_id
        AND cl.expires_at > NOW()
        AND cart.status = 'active'
        AND (p_exclude_cart_id IS NULL OR cl.cart_id != p_exclude_cart_id)
        AND (
          (cl.start_at, cl.end_at) OVERLAPS (p_start_at, p_end_at)
        )
    )
  ORDER BY pc.priority DESC, c.locker_id, c.compartment_number
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
