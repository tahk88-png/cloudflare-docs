-- Rentbox booking cart schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cart_status') THEN
    CREATE TYPE cart_status AS ENUM ('active', 'expired', 'checkout_pending', 'completed', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lock_status') THEN
    CREATE TYPE lock_status AS ENUM ('active', 'released', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('confirmed', 'active', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled', 'needs_refund');
  END IF;
END$$;

-- Minimal catalog/locker model needed for compartment assignment.
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  pricing_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, label)
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  status cart_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carts_status_expires_at_idx ON carts(status, expires_at);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  price_cents INTEGER NOT NULL,
  deposit_cents INTEGER NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON cart_items(product_id);

CREATE TABLE IF NOT EXISTS cart_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status lock_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS cart_locks_cart_id_idx ON cart_locks(cart_id);
CREATE INDEX IF NOT EXISTS cart_locks_compartment_id_idx ON cart_locks(compartment_id);
CREATE INDEX IF NOT EXISTS cart_locks_status_expires_at_idx ON cart_locks(status, expires_at);

-- Soft-lock hardening: prevent two ACTIVE locks from overlapping on the same compartment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cart_locks_no_overlap_active'
  ) THEN
    ALTER TABLE cart_locks
      ADD CONSTRAINT cart_locks_no_overlap_active
      EXCLUDE USING gist (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status = 'active');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  compartment_id UUID NOT NULL REFERENCES compartments(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  total_price_cents INTEGER NOT NULL,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS bookings_compartment_id_idx ON bookings(compartment_id);
CREATE INDEX IF NOT EXISTS bookings_product_id_idx ON bookings(product_id);
CREATE INDEX IF NOT EXISTS bookings_status_start_at_idx ON bookings(status, start_at);

-- Final hard protection: prevent overlap per compartment for active/confirmed bookings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_overlap_active'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap_active
      EXCLUDE USING gist (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status IN ('confirmed', 'active'));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NULL REFERENCES carts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  status payment_status NOT NULL,
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, intent_id)
);

-- One active payment intent per cart/provider (idempotent checkout).
CREATE UNIQUE INDEX IF NOT EXISTS payments_cart_provider_unique
  ON payments(cart_id, provider)
  WHERE cart_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_cart_id_idx ON payments(cart_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  UNIQUE (provider, event_id)
);

