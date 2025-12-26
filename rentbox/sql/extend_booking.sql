-- Extend booking (same compartment) with conflict checks
-- Inputs:
--   :booking_id BIGINT
--   :new_end_at TIMESTAMPTZ
--
-- Notes:
-- - Must run in a transaction.
-- - Lock the booking row FOR UPDATE.
-- - Exclude self when checking overlaps.
-- - Maintenance/block overrides apply.

WITH
locked AS (
  SELECT
    b.*,
    c.locker_id
  FROM bookings b
  JOIN compartments c ON c.id = b.compartment_id
  WHERE b.id = :booking_id::bigint
  FOR UPDATE
),
checks AS (
  SELECT
    l.id AS booking_id,
    l.compartment_id,
    l.locker_id,
    l.end_at AS old_end_at,
    :new_end_at::timestamptz AS new_end_at
  FROM locked l
),
conflict AS (
  SELECT 1 AS has_conflict
  FROM checks x
  WHERE
    x.new_end_at <= x.old_end_at
    OR EXISTS (
      SELECT 1
      FROM bookings b2
      WHERE b2.compartment_id = x.compartment_id
        AND b2.id <> x.booking_id
        AND b2.status IN ('pending','paid','active')
        AND tstzrange(b2.start_at, b2.end_at, '[)') &&
            tstzrange(x.old_end_at, x.new_end_at, '[)')
    )
    OR EXISTS (
      SELECT 1
      FROM calendar_events e
      WHERE e.status = 'active'
        AND e.scope IN ('maintenance','block')
        AND (
          e.compartment_id = x.compartment_id
          OR (e.compartment_id IS NULL AND e.locker_id = x.locker_id)
        )
        AND tstzrange(e.start_at, e.end_at, '[)') &&
            tstzrange(x.old_end_at, x.new_end_at, '[)')
    )
)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM conflict) THEN FALSE
  ELSE TRUE
END AS can_extend;
