-- Slot generation for a given local date (customer calendar)
-- Inputs:
--   :product_id BIGINT
--   :date       DATE (YYYY-MM-DD)
--   :tz         TEXT (e.g. 'Europe/Tallinn')
--   :step_minutes     INT (e.g. 30)
--   :duration_minutes INT (e.g. 120)
--
-- Output:
--   start_at TIMESTAMPTZ
--   end_at   TIMESTAMPTZ
--   is_available BOOLEAN
--
-- Notes:
-- - Slots are generated in the provided timezone using make_timestamptz.
-- - On DST transition days, some local times may map oddly; make_timestamptz handles this.

WITH
params AS (
  SELECT
    :product_id::bigint AS product_id,
    :date::date AS d,
    :tz::text AS tz,
    GREATEST(:step_minutes::int, 1) AS step_minutes,
    GREATEST(:duration_minutes::int, 1) AS duration_minutes
),
minute_offsets AS (
  -- generate minute offsets for a nominal 24h day; DST anomalies are handled by tz conversion
  SELECT generate_series(
    0,
    (24 * 60) - (SELECT duration_minutes FROM params),
    (SELECT step_minutes FROM params)
  )::int AS m
),
slots AS (
  SELECT
    make_timestamptz(
      EXTRACT(YEAR  FROM p.d)::int,
      EXTRACT(MONTH FROM p.d)::int,
      EXTRACT(DAY   FROM p.d)::int,
      (mo.m / 60)::int,
      (mo.m % 60)::int,
      0,
      p.tz
    ) AS start_at,
    make_timestamptz(
      EXTRACT(YEAR  FROM p.d)::int,
      EXTRACT(MONTH FROM p.d)::int,
      EXTRACT(DAY   FROM p.d)::int,
      (mo.m / 60)::int,
      (mo.m % 60)::int,
      0,
      p.tz
    ) + (p.duration_minutes || ' minutes')::interval AS end_at,
    p.product_id
  FROM params p
  JOIN minute_offsets mo ON TRUE
),
candidate_compartments AS (
  SELECT
    c.id AS compartment_id,
    c.locker_id
  FROM params p
  JOIN compartment_products cp
    ON cp.product_id = p.product_id
   AND cp.is_active
  JOIN compartments c
    ON c.id = cp.compartment_id
   AND c.is_active
  JOIN lockers l
    ON l.id = c.locker_id
   AND l.is_active
)
SELECT
  s.start_at,
  s.end_at,
  EXISTS (
    SELECT 1
    FROM candidate_compartments cc
    WHERE NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.compartment_id = cc.compartment_id
        AND b.status IN ('pending','paid','active')
        AND tstzrange(b.start_at, b.end_at, '[)') &&
            tstzrange(s.start_at, s.end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM calendar_events e
      WHERE e.status = 'active'
        AND e.scope IN ('maintenance','block')
        AND (
          e.compartment_id = cc.compartment_id
          OR (e.compartment_id IS NULL AND e.locker_id = cc.locker_id)
        )
        AND tstzrange(e.start_at, e.end_at, '[)') &&
            tstzrange(s.start_at, s.end_at, '[)')
    )
  ) AS is_available
FROM slots s
ORDER BY s.start_at;
