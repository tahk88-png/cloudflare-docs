-- Availability check (server truth)
-- Inputs:
--   :product_id BIGINT
--   :start_at   TIMESTAMPTZ
--   :end_at     TIMESTAMPTZ
--
-- Output:
--   available BOOLEAN
--   next_available_at TIMESTAMPTZ (nullable)
--
-- Blocking booking statuses: pending/paid/active
-- Blocking calendar scopes: maintenance/block (status='active')
-- Overlap definition: [start_at,end_at) intersects

WITH
params AS (
  SELECT
    :product_id::bigint AS product_id,
    :start_at::timestamptz AS start_at,
    :end_at::timestamptz AS end_at
),
req AS (
  SELECT
    product_id,
    start_at,
    end_at,
    (end_at - start_at) AS duration
  FROM params
),
candidate_compartments AS (
  SELECT
    c.id AS compartment_id,
    c.locker_id AS locker_id
  FROM req r
  JOIN compartment_products cp
    ON cp.product_id = r.product_id
   AND cp.is_active
  JOIN compartments c
    ON c.id = cp.compartment_id
   AND c.is_active
  JOIN lockers l
    ON l.id = c.locker_id
   AND l.is_active
),
available_now AS (
  SELECT EXISTS (
    SELECT 1
    FROM req r
    JOIN candidate_compartments cc ON TRUE
    WHERE NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.compartment_id = cc.compartment_id
        AND b.status IN ('pending','paid','active')
        AND tstzrange(b.start_at, b.end_at, '[)') &&
            tstzrange(r.start_at, r.end_at, '[)')
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
            tstzrange(r.start_at, r.end_at, '[)')
    )
  ) AS available
),
-- Candidate start times for "next availability":
-- try at requested start + all blocking end boundaries for relevant resources.
candidate_starts AS (
  SELECT r.start_at AS candidate_start
  FROM req r
  UNION
  SELECT b.end_at
  FROM req r
  JOIN candidate_compartments cc ON TRUE
  JOIN bookings b
    ON b.compartment_id = cc.compartment_id
   AND b.status IN ('pending','paid','active')
   AND tstzrange(b.start_at, b.end_at, '[)') &&
       tstzrange(r.start_at, r.end_at, '[)')
  UNION
  SELECT e.end_at
  FROM req r
  JOIN candidate_compartments cc ON TRUE
  JOIN calendar_events e
    ON e.status = 'active'
   AND e.scope IN ('maintenance','block')
   AND (
     e.compartment_id = cc.compartment_id
     OR (e.compartment_id IS NULL AND e.locker_id = cc.locker_id)
   )
   AND tstzrange(e.start_at, e.end_at, '[)') &&
       tstzrange(r.start_at, r.end_at, '[)')
),
candidate_starts_ranked AS (
  SELECT DISTINCT candidate_start
  FROM candidate_starts
  WHERE candidate_start >= (SELECT start_at FROM req)
  ORDER BY candidate_start
  LIMIT 200
),
next_available AS (
  SELECT csr.candidate_start AS next_available_at
  FROM req r
  JOIN candidate_starts_ranked csr ON TRUE
  WHERE EXISTS (
    SELECT 1
    FROM candidate_compartments cc
    WHERE NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.compartment_id = cc.compartment_id
        AND b.status IN ('pending','paid','active')
        AND tstzrange(b.start_at, b.end_at, '[)') &&
            tstzrange(csr.candidate_start, csr.candidate_start + r.duration, '[)')
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
            tstzrange(csr.candidate_start, csr.candidate_start + r.duration, '[)')
    )
  )
  ORDER BY csr.candidate_start
  LIMIT 1
)
SELECT
  an.available,
  CASE WHEN an.available THEN (SELECT start_at FROM req)
       ELSE (SELECT next_available_at FROM next_available)
  END AS next_available_at
FROM available_now an;
