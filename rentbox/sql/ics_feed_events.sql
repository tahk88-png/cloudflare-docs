-- ICS feed backing query (events list for export)
-- Inputs:
--   :scope TEXT  -- 'locker'|'compartment'|'product'
--   :id    BIGINT
--   :token_hash TEXT -- sha256 hex of token provided by client
--   :from TIMESTAMPTZ NULL -- optional range start
--   :to   TIMESTAMPTZ NULL -- optional range end
--
-- Output:
--   uid TEXT
--   start_at TIMESTAMPTZ
--   end_at TIMESTAMPTZ
--   summary TEXT
--   description TEXT
--
-- Note: actual ICS string formatting is typically done in the app layer.

WITH
params AS (
  SELECT
    :scope::text AS scope,
    :id::bigint AS scope_id,
    :token_hash::text AS token_hash,
    COALESCE(:from::timestamptz, now() - interval '30 days') AS from_at,
    COALESCE(:to::timestamptz,   now() + interval '180 days') AS to_at
),
auth AS (
  SELECT 1
  FROM params p
  JOIN ics_tokens t
    ON t.scope = p.scope
   AND t.scope_id = p.scope_id
   AND t.token_hash = p.token_hash
   AND t.revoked_at IS NULL
),
scope_compartments AS (
  -- compartments included by the ICS scope
  SELECT c.id AS compartment_id, c.locker_id
  FROM params p
  JOIN compartments c ON TRUE
  WHERE
    (p.scope = 'compartment' AND c.id = p.scope_id)
    OR (p.scope = 'locker' AND c.locker_id = p.scope_id)
),
booking_rows AS (
  -- Locker/compartment scoped feeds
  SELECT
    b.id,
    b.start_at,
    b.end_at,
    b.status,
    b.product_id,
    b.compartment_id,
    c.locker_id
  FROM params p
  JOIN auth a ON TRUE
  JOIN bookings b ON TRUE
  JOIN scope_compartments sc ON sc.compartment_id = b.compartment_id
  JOIN compartments c ON c.id = b.compartment_id
  WHERE p.scope IN ('locker','compartment')
    AND b.start_at < p.to_at
    AND b.end_at > p.from_at

  UNION ALL

  -- Product scoped feeds
  SELECT
    b.id,
    b.start_at,
    b.end_at,
    b.status,
    b.product_id,
    b.compartment_id,
    c.locker_id
  FROM params p
  JOIN auth a ON TRUE
  JOIN bookings b
    ON p.scope = 'product'
   AND b.product_id = p.scope_id
  JOIN compartments c ON c.id = b.compartment_id
  WHERE b.start_at < p.to_at
    AND b.end_at > p.from_at
),
block_rows AS (
  SELECT
    e.id,
    e.start_at,
    e.end_at,
    e.scope,
    e.title,
    e.meta,
    e.compartment_id,
    e.locker_id
  FROM params p
  JOIN auth a ON TRUE
  JOIN calendar_events e ON TRUE
  WHERE e.status = 'active'
    AND e.scope IN ('maintenance','block')
    AND e.start_at < p.to_at
    AND e.end_at > p.from_at
    AND (
      (p.scope = 'locker' AND e.locker_id = p.scope_id)
      OR (p.scope = 'compartment' AND (e.compartment_id = p.scope_id OR (e.compartment_id IS NULL AND e.locker_id IN (SELECT locker_id FROM scope_compartments LIMIT 1))))
      OR (p.scope = 'product') -- optional: include blocks in product feeds too
    )
)
SELECT
  ('booking-' || b.id || '@rentbox.ee')::text AS uid,
  b.start_at,
  b.end_at,
  ('Booking #' || b.id || ' (' || b.status || ')')::text AS summary,
  ('Product ' || b.product_id || ' | Compartment ' || b.compartment_id || ' | Locker ' || b.locker_id)::text AS description
FROM booking_rows b
UNION ALL
SELECT
  ('event-' || e.id || '@rentbox.ee')::text AS uid,
  e.start_at,
  e.end_at,
  e.title AS summary,
  COALESCE(e.meta->>'reason', '')::text AS description
FROM block_rows e
ORDER BY start_at, end_at, uid;
