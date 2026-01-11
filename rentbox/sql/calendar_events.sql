-- Calendar events query (customer/admin)
-- Inputs (nullable filters):
--   :from TIMESTAMPTZ
--   :to   TIMESTAMPTZ
--   :scope TEXT NULL            -- 'booking'|'maintenance'|'block'
--   :locker_id BIGINT NULL
--   :compartment_id BIGINT NULL
--   :product_id BIGINT NULL
--
-- Output shape matches:
--   { id, title, start_at, end_at, scope, status, meta }
--
-- Strategy:
-- - Return bookings as "virtual events" (scope='booking') so UI can render them uniformly.
-- - Union with calendar_events rows (maintenance/block + optional booking mirrors).

WITH
params AS (
  SELECT
    :from::timestamptz AS from_at,
    :to::timestamptz AS to_at,
    NULLIF(:scope::text, '') AS scope,
    :locker_id::bigint AS locker_id,
    :compartment_id::bigint AS compartment_id,
    :product_id::bigint AS product_id
),
booking_events AS (
  SELECT
    b.id AS id,
    'booking'::text AS scope,
    b.status AS status,
    b.start_at,
    b.end_at,
    ('Booking #' || b.id)::text AS title,
    jsonb_build_object(
      'booking_id', b.id,
      'product_id', b.product_id,
      'compartment_id', b.compartment_id,
      'locker_id', c.locker_id,
      'total_price', b.total_price,
      'deposit', b.deposit
    ) AS meta
  FROM params p
  JOIN bookings b ON TRUE
  JOIN compartments c ON c.id = b.compartment_id
  WHERE b.start_at < p.to_at
    AND b.end_at > p.from_at
    AND (p.scope IS NULL OR p.scope = 'booking')
    AND (p.compartment_id IS NULL OR b.compartment_id = p.compartment_id)
    AND (p.locker_id IS NULL OR c.locker_id = p.locker_id)
    AND (p.product_id IS NULL OR b.product_id = p.product_id)
),
non_booking_events AS (
  SELECT
    e.id AS id,
    e.scope,
    e.status,
    e.start_at,
    e.end_at,
    e.title,
    e.meta
  FROM params p
  JOIN calendar_events e ON TRUE
  WHERE e.start_at < p.to_at
    AND e.end_at > p.from_at
    AND (p.scope IS NULL OR e.scope = p.scope)
    AND (p.compartment_id IS NULL OR e.compartment_id = p.compartment_id)
    AND (p.locker_id IS NULL OR e.locker_id = p.locker_id)
)
SELECT id, title, start_at, end_at, scope, status, meta
FROM booking_events
UNION ALL
SELECT id, title, start_at, end_at, scope, status, meta
FROM non_booking_events
ORDER BY start_at, end_at, id;
