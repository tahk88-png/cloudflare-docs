-- Rentbox.ee Booking + Calendar System (PostgreSQL)
-- Migration 002: pricing + race-safe booking creation + lifecycle helpers
--
-- This migration introduces PL/pgSQL helpers to keep the server as source of truth.
-- The API layer should wrap these functions in explicit transactions.

BEGIN;

-- -----------------------------------------
-- Pricing quote (simple baseline)
-- -----------------------------------------
-- Returns total_price and deposit for a requested range.
-- Policy: compute both hourly and daily totals and charge the minimum.
CREATE OR REPLACE FUNCTION rentbox_quote(
  p_product_id BIGINT,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS TABLE(total_price INT, deposit INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_seconds NUMERIC;
  v_hours INT;
  v_days INT;
BEGIN
  IF p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'start_at must be < end_at';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id AND is_active
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found or inactive';
  END IF;

  v_seconds := EXTRACT(EPOCH FROM (p_end_at - p_start_at));
  v_hours := CEIL(v_seconds / 3600.0)::int;
  v_days := CEIL(v_seconds / 86400.0)::int;

  total_price := LEAST(v_hours * v_product.price_hour, v_days * v_product.price_day);
  deposit := v_product.deposit;
  RETURN NEXT;
END;
$$;

-- -----------------------------------------
-- Lifecycle transition guard
-- -----------------------------------------
CREATE OR REPLACE FUNCTION rentbox_can_transition(
  p_from TEXT,
  p_to TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT CASE
    WHEN p_from IS NULL AND p_to = 'pending' THEN TRUE
    WHEN p_from = 'pending' AND p_to IN ('paid','expired') THEN TRUE
    WHEN p_from = 'paid' AND p_to IN ('active','cancelled') THEN TRUE
    WHEN p_from = 'active' AND p_to IN ('overdue','completed') THEN TRUE
    WHEN p_from = 'overdue' AND p_to = 'completed' THEN TRUE
    ELSE FALSE
  END;
$$;

-- -----------------------------------------
-- Race-safe pending booking creation
-- -----------------------------------------
-- Key properties:
-- - Auto-assigns a free compartment
-- - Maintenance/block events override availability
-- - Uses exclusion constraint to guarantee "never double-book"
-- - Uses idempotency_key to make creation retry-safe
--
-- Throws:
-- - 'no_free_compartment' if none available
-- - generic exceptions for invalid inputs
CREATE OR REPLACE FUNCTION rentbox_create_pending_booking(
  p_product_id BIGINT,
  p_user_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_pending_ttl_minutes INT DEFAULT 15
)
RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_quote RECORD;
  v_expires_at TIMESTAMPTZ;
  v_candidate RECORD;
BEGIN
  IF p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'start_at must be < end_at';
  END IF;
  IF p_pending_ttl_minutes IS NULL OR p_pending_ttl_minutes < 1 OR p_pending_ttl_minutes > 60 THEN
    RAISE EXCEPTION 'pending_ttl_minutes must be within 1..60';
  END IF;

  -- Idempotency: if the key already produced a booking, return it.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_booking
    FROM bookings
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN v_booking;
    END IF;
  END IF;

  SELECT * INTO v_quote
  FROM rentbox_quote(p_product_id, p_start_at, p_end_at);

  v_expires_at := now() + make_interval(mins => p_pending_ttl_minutes);

  FOR v_candidate IN
    SELECT
      c.id AS compartment_id,
      c.locker_id AS locker_id
    FROM compartment_products cp
    JOIN compartments c
      ON c.id = cp.compartment_id AND c.is_active
    JOIN lockers l
      ON l.id = c.locker_id AND l.is_active
    WHERE cp.product_id = p_product_id
      AND cp.is_active
    ORDER BY c.id
  LOOP
    -- Maintenance/block overrides
    IF EXISTS (
      SELECT 1
      FROM calendar_events e
      WHERE e.status = 'active'
        AND e.scope IN ('maintenance','block')
        AND (
          e.compartment_id = v_candidate.compartment_id
          OR (e.compartment_id IS NULL AND e.locker_id = v_candidate.locker_id)
        )
        AND tstzrange(e.start_at, e.end_at, '[)') &&
            tstzrange(p_start_at, p_end_at, '[)')
    ) THEN
      CONTINUE;
    END IF;

    -- Fast path overlap check (the exclusion constraint is the real enforcement)
    IF EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.compartment_id = v_candidate.compartment_id
        AND b.status IN ('pending','paid','active')
        AND tstzrange(b.start_at, b.end_at, '[)') &&
            tstzrange(p_start_at, p_end_at, '[)')
    ) THEN
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO bookings (
        product_id, compartment_id, user_id,
        start_at, end_at,
        status, total_price, deposit,
        pending_expires_at, idempotency_key
      )
      VALUES (
        p_product_id, v_candidate.compartment_id, p_user_id,
        p_start_at, p_end_at,
        'pending', v_quote.total_price, v_quote.deposit,
        v_expires_at, p_idempotency_key
      )
      RETURNING * INTO v_booking;

      INSERT INTO booking_audit_log (
        booking_id, from_status, to_status, actor_type, actor_id, reason, meta
      )
      VALUES (
        v_booking.id, NULL, 'pending', 'user', p_user_id, 'create_pending',
        jsonb_build_object('idempotency_key', p_idempotency_key, 'pending_expires_at', v_expires_at)
      );

      RETURN v_booking;
    EXCEPTION
      WHEN exclusion_violation THEN
        -- Race: someone else booked this compartment at the same time.
        -- Try the next compartment.
        CONTINUE;
    END;
  END LOOP;

  RAISE EXCEPTION 'no_free_compartment'
    USING ERRCODE = 'P0001';
END;
$$;

-- -----------------------------------------
-- Status transition helper (row-lock + audit)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION rentbox_set_booking_status(
  p_booking_id BIGINT,
  p_to_status TEXT,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_from TEXT;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  v_from := v_booking.status;

  IF NOT rentbox_can_transition(v_from, p_to_status) THEN
    RAISE EXCEPTION 'invalid transition: % -> %', v_from, p_to_status;
  END IF;

  UPDATE bookings
  SET status = p_to_status,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  INSERT INTO booking_audit_log (
    booking_id, from_status, to_status, actor_type, actor_id, reason, meta
  )
  VALUES (
    v_booking.id, v_from, p_to_status, p_actor_type, p_actor_id, p_reason, p_meta
  );

  RETURN v_booking;
END;
$$;

-- -----------------------------------------
-- Pending expiry sweep (run every minute or so)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION rentbox_expire_pending(p_now TIMESTAMPTZ DEFAULT now())
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH expired AS (
    UPDATE bookings
    SET status = 'expired',
        updated_at = p_now
    WHERE status = 'pending'
      AND pending_expires_at IS NOT NULL
      AND pending_expires_at <= p_now
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  INSERT INTO booking_audit_log (booking_id, from_status, to_status, actor_type, reason, meta)
  SELECT id, 'pending', 'expired', 'system', 'pending_ttl_expired', jsonb_build_object('now', p_now)
  FROM expired;

  RETURN v_count;
END;
$$;

-- -----------------------------------------
-- Overdue sweep (active where now > end_at)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION rentbox_mark_overdue(p_now TIMESTAMPTZ DEFAULT now())
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH overdue AS (
    UPDATE bookings
    SET status = 'overdue',
        updated_at = p_now
    WHERE status = 'active'
      AND end_at < p_now
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM overdue;

  INSERT INTO booking_audit_log (booking_id, from_status, to_status, actor_type, reason, meta)
  SELECT id, 'active', 'overdue', 'system', 'end_at_passed', jsonb_build_object('now', p_now)
  FROM overdue;

  RETURN v_count;
END;
$$;

COMMIT;
