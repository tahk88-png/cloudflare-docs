-- Add bookings table and related structures
-- Migration: Add booking system

-- Add status enum
CREATE TYPE booking_status AS ENUM ('pending', 'paid', 'active', 'completed', 'cancelled', 'expired');

-- Add bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  compartment_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  
  price_per_hour DECIMAL(10,2),
  price_per_day DECIMAL(10,2),
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  status booking_status DEFAULT 'pending',
  
  payment_intent_id TEXT,
  payment_method TEXT,
  paid_at TIMESTAMP,
  
  access_code TEXT,
  instructions TEXT,
  
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_compartment FOREIGN KEY (compartment_id) REFERENCES compartments(id) ON DELETE RESTRICT,
  CONSTRAINT valid_time_range CHECK (end_at > start_at),
  CONSTRAINT valid_price CHECK (total_price > 0)
);

-- Add indexes for performance
CREATE INDEX idx_bookings_product ON bookings(product_id);
CREATE INDEX idx_bookings_compartment ON bookings(compartment_id);
CREATE INDEX idx_bookings_time_range ON bookings(start_at, end_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_email ON bookings(user_email);

-- Composite index for availability queries
CREATE INDEX idx_bookings_compartment_time ON bookings(compartment_id, start_at, end_at) 
  WHERE status IN ('pending', 'paid', 'active');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add compartment_products junction table (if products can be in multiple compartments)
CREATE TABLE IF NOT EXISTS compartment_products (
  id TEXT PRIMARY KEY,
  compartment_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_compartment FOREIGN KEY (compartment_id) REFERENCES compartments(id) ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT unique_compartment_product UNIQUE(compartment_id, product_id)
);

CREATE INDEX idx_compartment_products_compartment ON compartment_products(compartment_id);
CREATE INDEX idx_compartment_products_product ON compartment_products(product_id);
