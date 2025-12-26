-- Rentbox v2 Initial Schema Migration
-- CRITICAL: This migration sets up core constraints that guarantee data integrity

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CRITICAL CONSTRAINT: NO DOUBLE BOOKINGS
-- ============================================================================
-- This exclusion constraint is the heart of the booking system.
-- It guarantees at the database level that no two active bookings
-- can overlap for the same compartment.

-- First, create the bookings table (simplified for constraint demo)
-- The full table is created by Prisma, this adds the constraint after

-- Add exclusion constraint to prevent overlapping bookings
-- This MUST be added after the bookings table is created
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'expired'));

-- Add exclusion constraint for maintenance blocks
ALTER TABLE maintenance_blocks ADD CONSTRAINT no_overlapping_maintenance
  EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  );

-- ============================================================================
-- ADDITIONAL CONSTRAINTS
-- ============================================================================

-- Ensure booking times are valid
ALTER TABLE bookings ADD CONSTRAINT valid_booking_times
  CHECK (end_at > start_at);

ALTER TABLE bookings ADD CONSTRAINT valid_booking_duration
  CHECK (end_at - start_at <= interval '30 days');

-- Ensure maintenance block times are valid
ALTER TABLE maintenance_blocks ADD CONSTRAINT valid_maintenance_times
  CHECK (end_at > start_at);

-- Ensure payment amounts are positive
ALTER TABLE payments ADD CONSTRAINT positive_payment_amount
  CHECK (amount > 0);

-- Ensure deposit amounts are non-negative
ALTER TABLE bookings ADD CONSTRAINT non_negative_deposit
  CHECK (deposit_amount >= 0);

-- Ensure pricing is consistent
ALTER TABLE products ADD CONSTRAINT valid_pricing
  CHECK (price_per_day >= price_per_hour);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for availability queries (most common query)
CREATE INDEX idx_bookings_availability ON bookings (compartment_id, start_at, end_at)
  WHERE status NOT IN ('cancelled', 'expired');

-- Index for overdue detection job
CREATE INDEX idx_bookings_overdue_detection ON bookings (status, end_at)
  WHERE status = 'ACTIVE';

-- Index for pending expiration job
CREATE INDEX idx_bookings_pending_expiration ON bookings (status, expires_at)
  WHERE status = 'PENDING';

-- Index for locker event queries
CREATE INDEX idx_locker_events_recent ON locker_events (locker_id, created_at DESC);

-- Index for notification delivery queue
CREATE INDEX idx_notifications_pending ON notifications (scheduled_at)
  WHERE status = 'PENDING' OR status = 'SCHEDULED';

-- Index for audit log queries
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check compartment availability
CREATE OR REPLACE FUNCTION check_compartment_availability(
  p_compartment_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE compartment_id = p_compartment_id
      AND status NOT IN ('cancelled', 'expired')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  )
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_blocks
    WHERE compartment_id = p_compartment_id
      AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find next available slot for a compartment
CREATE OR REPLACE FUNCTION find_next_available_slot(
  p_compartment_id UUID,
  p_from_time TIMESTAMPTZ,
  p_duration INTERVAL,
  p_max_lookahead INTERVAL DEFAULT interval '30 days'
)
RETURNS TABLE (
  available_start TIMESTAMPTZ,
  available_end TIMESTAMPTZ
) AS $$
DECLARE
  v_current_time TIMESTAMPTZ := p_from_time;
  v_max_time TIMESTAMPTZ := p_from_time + p_max_lookahead;
  v_blocking_end TIMESTAMPTZ;
BEGIN
  WHILE v_current_time < v_max_time LOOP
    -- Check if current slot is available
    IF check_compartment_availability(
      p_compartment_id,
      v_current_time,
      v_current_time + p_duration
    ) THEN
      available_start := v_current_time;
      available_end := v_current_time + p_duration;
      RETURN NEXT;
      RETURN;
    END IF;
    
    -- Find the end of the blocking booking/maintenance
    SELECT COALESCE(
      (SELECT MIN(end_at) FROM bookings 
       WHERE compartment_id = p_compartment_id 
         AND status NOT IN ('cancelled', 'expired')
         AND end_at > v_current_time),
      (SELECT MIN(end_at) FROM maintenance_blocks
       WHERE compartment_id = p_compartment_id
         AND end_at > v_current_time),
      v_max_time
    ) INTO v_blocking_end;
    
    v_current_time := v_blocking_end;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate rental price
CREATE OR REPLACE FUNCTION calculate_rental_price(
  p_hourly_rate DECIMAL,
  p_daily_rate DECIMAL,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS DECIMAL AS $$
DECLARE
  v_hours DECIMAL;
  v_days DECIMAL;
  v_hourly_total DECIMAL;
  v_daily_total DECIMAL;
BEGIN
  v_hours := EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 3600;
  v_days := CEIL(v_hours / 24);
  
  v_hourly_total := CEIL(v_hours) * p_hourly_rate;
  v_daily_total := v_days * p_daily_rate;
  
  -- Return the cheaper option
  RETURN LEAST(v_hourly_total, v_daily_total);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate late fees
CREATE OR REPLACE FUNCTION calculate_late_fee(
  p_end_at TIMESTAMPTZ,
  p_actual_return_at TIMESTAMPTZ,
  p_hourly_rate DECIMAL,
  p_grace_minutes INTEGER DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
  v_late_minutes DECIMAL;
  v_late_hours DECIMAL;
BEGIN
  IF p_actual_return_at IS NULL OR p_actual_return_at <= p_end_at + (p_grace_minutes || ' minutes')::INTERVAL THEN
    RETURN 0;
  END IF;
  
  v_late_minutes := EXTRACT(EPOCH FROM (p_actual_return_at - p_end_at - (p_grace_minutes || ' minutes')::INTERVAL)) / 60;
  v_late_hours := CEIL(v_late_minutes / 60);
  
  -- Late fee is 1.5x the hourly rate
  RETURN v_late_hours * p_hourly_rate * 1.5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to auto-generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := 'RB-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
                          upper(substr(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_number();

-- Trigger to auto-generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := 'INC-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
                           upper(substr(gen_random_uuid()::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION generate_incident_number();

-- Trigger to update compartment status based on bookings
CREATE OR REPLACE FUNCTION update_compartment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'ACTIVE' THEN
      UPDATE compartments SET status = 'OCCUPIED' WHERE id = NEW.compartment_id;
    ELSIF NEW.status IN ('COMPLETED', 'CANCELLED', 'EXPIRED') AND 
          OLD IS NOT NULL AND OLD.status = 'ACTIVE' THEN
      -- Check if any other active booking exists
      IF NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE compartment_id = NEW.compartment_id 
          AND status = 'ACTIVE' 
          AND id != NEW.id
      ) THEN
        UPDATE compartments SET status = 'AVAILABLE' WHERE id = NEW.compartment_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_compartment_status
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_compartment_status();

-- Trigger for audit logging on critical tables
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, created_at)
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_contracts
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for current availability by location
CREATE OR REPLACE VIEW v_compartment_availability AS
SELECT 
  c.id AS compartment_id,
  c.number AS compartment_number,
  c.size,
  c.status,
  l.id AS locker_id,
  l.name AS locker_name,
  loc.id AS location_id,
  loc.name AS location_name,
  loc.city,
  CASE 
    WHEN c.status = 'AVAILABLE' 
         AND NOT EXISTS (
           SELECT 1 FROM bookings b 
           WHERE b.compartment_id = c.id 
             AND b.status IN ('PENDING', 'PAID', 'ACTIVE')
             AND NOW() BETWEEN b.start_at AND b.end_at
         )
    THEN TRUE 
    ELSE FALSE 
  END AS is_available_now,
  (
    SELECT MIN(b.start_at) FROM bookings b
    WHERE b.compartment_id = c.id
      AND b.status IN ('PENDING', 'PAID', 'ACTIVE')
      AND b.start_at > NOW()
  ) AS next_booking_start
FROM compartments c
JOIN lockers l ON c.locker_id = l.id
JOIN locations loc ON l.location_id = loc.id
WHERE l.status = 'ONLINE' AND loc.is_active = TRUE;

-- View for active rentals dashboard
CREATE OR REPLACE VIEW v_active_rentals AS
SELECT 
  b.id AS booking_id,
  b.booking_number,
  b.user_id,
  u.first_name || ' ' || u.last_name AS customer_name,
  u.email AS customer_email,
  u.phone AS customer_phone,
  p.name AS product_name,
  p.slug AS product_slug,
  b.start_at,
  b.end_at,
  b.status,
  loc.name AS location_name,
  loc.address AS location_address,
  l.name AS locker_name,
  c.number AS compartment_number,
  b.total_amount,
  b.deposit_amount,
  CASE 
    WHEN b.status = 'ACTIVE' AND NOW() > b.end_at THEN 'OVERDUE'
    WHEN b.status = 'ACTIVE' AND NOW() > b.end_at - interval '1 hour' THEN 'ENDING_SOON'
    ELSE b.status::TEXT
  END AS effective_status,
  EXTRACT(EPOCH FROM (b.end_at - NOW()))::INTEGER AS seconds_remaining
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN products p ON b.product_id = p.id
JOIN compartments c ON b.compartment_id = c.id
JOIN lockers l ON c.locker_id = l.id
JOIN locations loc ON l.location_id = loc.id
WHERE b.status IN ('PENDING', 'PAID', 'ACTIVE', 'OVERDUE');

-- View for daily operations report
CREATE OR REPLACE VIEW v_daily_operations AS
SELECT 
  DATE(b.created_at AT TIME ZONE 'Europe/Tallinn') AS booking_date,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'COMPLETED') AS completed_bookings,
  COUNT(*) FILTER (WHERE b.status = 'CANCELLED') AS cancelled_bookings,
  COUNT(*) FILTER (WHERE b.status = 'OVERDUE') AS overdue_bookings,
  SUM(b.total_amount) FILTER (WHERE b.status IN ('PAID', 'ACTIVE', 'COMPLETED')) AS total_revenue,
  SUM(b.late_fee_amount) FILTER (WHERE b.late_fee_amount > 0) AS total_late_fees,
  COUNT(DISTINCT b.user_id) AS unique_customers
FROM bookings b
WHERE b.created_at >= NOW() - interval '90 days'
GROUP BY DATE(b.created_at AT TIME ZONE 'Europe/Tallinn')
ORDER BY booking_date DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own bookings
CREATE POLICY customer_bookings ON bookings
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR current_setting('app.current_user_role') IN ('ADMIN', 'OPERATOR')
  );

-- Similar policies for other tables...
-- (Omitted for brevity, but follow same pattern)

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE bookings IS 'Core booking records with time-based availability constraint';
COMMENT ON CONSTRAINT no_overlapping_bookings ON bookings IS 'CRITICAL: Prevents double-booking at database level using exclusion constraint';
COMMENT ON FUNCTION check_compartment_availability IS 'Checks if a time slot is available for a compartment';
COMMENT ON FUNCTION find_next_available_slot IS 'Finds the next available booking slot for a compartment';
COMMENT ON VIEW v_compartment_availability IS 'Real-time compartment availability for customer-facing UI';
