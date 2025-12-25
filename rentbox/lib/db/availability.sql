-- Availability Query Functions
-- These queries check compartment availability for time ranges

-- 1. Check if ANY compartment is available for a product in a time range
-- Returns true if at least one free compartment exists
WITH available_compartments AS (
  SELECT c.id as compartment_id
  FROM compartments c
  WHERE c.product_id = $1  -- product_id parameter
    AND c.active = true
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.compartment_id = c.id
        AND b.status IN ('pending', 'paid', 'active')
        AND (
          -- Check for time overlap
          (b.start_at <= $2 AND b.end_at > $2)  -- start_at parameter
          OR (b.start_at < $3 AND b.end_at >= $3)  -- end_at parameter
          OR (b.start_at >= $2 AND b.end_at <= $3)
        )
    )
  LIMIT 1
)
SELECT EXISTS (SELECT 1 FROM available_compartments) as is_available;

-- 2. Get first available compartment for a time range
-- Returns compartment_id or NULL
SELECT c.id as compartment_id, c.label, l.name as locker_name
FROM compartments c
JOIN lockers l ON l.id = c.locker_id
WHERE c.product_id = $1
  AND c.active = true
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.compartment_id = c.id
      AND b.status IN ('pending', 'paid', 'active')
      AND (
        (b.start_at <= $2 AND b.end_at > $2)
        OR (b.start_at < $3 AND b.end_at >= $3)
        OR (b.start_at >= $2 AND b.end_at <= $3)
      )
  )
LIMIT 1;

-- 3. Get availability calendar for a product (next 30 days, hourly slots)
-- Returns array of {date, hour, available}
WITH RECURSIVE time_slots AS (
  -- Generate hourly slots for next 30 days
  SELECT 
    DATE_TRUNC('hour', NOW()) + (n || ' hours')::INTERVAL as slot_start
  FROM generate_series(0, 30*24-1) n
),
compartment_count AS (
  -- Total compartments for product
  SELECT COUNT(*) as total
  FROM compartments
  WHERE product_id = $1 AND active = true
),
booked_slots AS (
  -- Count bookings per hour slot
  SELECT 
    DATE_TRUNC('hour', b.start_at) as slot_start,
    COUNT(DISTINCT b.compartment_id) as booked_count
  FROM bookings b
  JOIN compartments c ON c.id = b.compartment_id
  WHERE c.product_id = $1
    AND b.status IN ('pending', 'paid', 'active')
    AND b.start_at >= NOW()
    AND b.start_at < NOW() + INTERVAL '30 days'
  GROUP BY DATE_TRUNC('hour', b.start_at)
)
SELECT 
  ts.slot_start,
  DATE(ts.slot_start) as date,
  EXTRACT(HOUR FROM ts.slot_start) as hour,
  COALESCE(cc.total, 0) - COALESCE(bs.booked_count, 0) as available_count,
  COALESCE(cc.total, 0) - COALESCE(bs.booked_count, 0) > 0 as is_available
FROM time_slots ts
CROSS JOIN compartment_count cc
LEFT JOIN booked_slots bs ON bs.slot_start = ts.slot_start
WHERE ts.slot_start >= NOW()
ORDER BY ts.slot_start;

-- 4. Get next available time slot
-- Returns {start_at, end_at} or NULL if fully booked for 30 days
WITH available_slot AS (
  SELECT 
    DATE_TRUNC('hour', NOW()) + (n || ' hours')::INTERVAL as slot_start,
    DATE_TRUNC('hour', NOW()) + (n || ' hours')::INTERVAL + INTERVAL '1 hour' as slot_end
  FROM generate_series(0, 30*24-1) n
)
SELECT 
  a.slot_start as next_available_start,
  a.slot_end as next_available_end
FROM available_slot a
WHERE EXISTS (
  SELECT 1 FROM compartments c
  WHERE c.product_id = $1
    AND c.active = true
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.compartment_id = c.id
        AND b.status IN ('pending', 'paid', 'active')
        AND (
          (b.start_at <= a.slot_start AND b.end_at > a.slot_start)
          OR (b.start_at < a.slot_end AND b.end_at >= a.slot_end)
          OR (b.start_at >= a.slot_start AND b.end_at <= a.slot_end)
        )
    )
)
LIMIT 1;

-- 5. Validate booking doesn't conflict (use in transaction)
-- Returns true if no conflict, raises error if conflict
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.compartment_id = $1  -- compartment_id
      AND b.status IN ('pending', 'paid', 'active')
      AND (
        (b.start_at <= $2 AND b.end_at > $2)  -- start_at
        OR (b.start_at < $3 AND b.end_at >= $3)  -- end_at
        OR (b.start_at >= $2 AND b.end_at <= $3)
      )
  ) THEN
    RAISE EXCEPTION 'Compartment not available for selected time range';
  END IF;
END $$;
