-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable btree_gist for exclusion constraints
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create custom function to check booking overlaps
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE compartment_id = NEW.compartment_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status IN ('paid', 'active')
      AND tsrange(start_at, end_at) && tsrange(NEW.start_at, NEW.end_at)
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with existing active booking for this compartment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Tables are created by Prisma migrations
-- This file contains additional constraints and indexes

-- After Prisma creates tables, add exclusion constraint for bookings
-- This prevents overlapping bookings at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_overlap 
ON bookings (compartment_id, id)
WHERE status IN ('paid', 'active')
WITH (fillfactor = 90);

-- Create trigger for overlap checking
DROP TRIGGER IF EXISTS trigger_check_booking_overlap ON bookings;
CREATE TRIGGER trigger_check_booking_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('paid', 'active'))
  EXECUTE FUNCTION check_booking_overlap();

-- Create GIST index for efficient range queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates_gist 
ON bookings USING GIST (tsrange(start_at, end_at))
WHERE status IN ('paid', 'active');

CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_dates_gist
ON maintenance_blocks USING GIST (tsrange(start_at, end_at));
