# Rentbox.ee Booking + Calendar System Pack

This folder contains a **race-safe time-based booking system** with a **calendar system** for a 24/7 self-service tool rental platform.

## Deliverables (where to look)

- **DB schema + migrations**
  - `rentbox/migrations/001_init.sql`
  - `rentbox/migrations/002_functions.sql`
- **Availability SQL + slot generation SQL**
  - `rentbox/sql/availability.sql`
  - `rentbox/sql/slots.sql`
- **Calendar events query SQL**
  - `rentbox/sql/calendar_events.sql`
- **API route definitions**
  - `rentbox/api/openapi.yaml`
- **UI component structure**
  - `rentbox/ui/component-structure.md`

## Booking lifecycle (server-enforced)

Statuses: `pending`, `paid`, `active`, `completed`, `overdue`, `cancelled`, `expired`

Transitions enforced by `rentbox_can_transition()` (see `rentbox/migrations/002_functions.sql`):
- `pending → paid → active → completed`
- `pending → expired`
- `paid → cancelled` (policy-based in API)
- `active → overdue → completed` (overdue via sweep or on-read)

## Hard conflict prevention (never double-book)

The key protection is the partial exclusion constraint:

```104:110:rentbox/migrations/001_init.sql
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap_blocking
  EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status IN ('pending','paid','active'));
```

This is race-safe because the database rejects overlaps under concurrent writes.

## Availability logic (server source of truth)

Availability means: **at least one free compartment exists** for the product in the requested range, after considering:
- blocking bookings: `pending`, `paid`, `active`
- maintenance/block events: `calendar_events.scope IN ('maintenance','block') AND status='active'`

SQL you can use directly:
- `rentbox/sql/availability.sql` → `{ available, next_available_at }`
- `rentbox/sql/slots.sql` → day slots (`step_minutes` + `duration_minutes`)

## Example JSON responses

### `GET /api/products/:id/availability?start_at=...&end_at=...`

```json
{
  "available": false,
  "next_available_at": "2025-12-26T14:00:00.000Z"
}
```

### `GET /api/products/:id/slots?date=2025-12-26&step_minutes=30&duration_minutes=120&tz=Europe/Tallinn`

```json
[
  { "start_at": "2025-12-26T06:00:00.000Z", "end_at": "2025-12-26T08:00:00.000Z", "is_available": true },
  { "start_at": "2025-12-26T06:30:00.000Z", "end_at": "2025-12-26T08:30:00.000Z", "is_available": false }
]
```

### `POST /api/bookings` (creates pending, auto-assigns compartment)

```json
{
  "id": 8123,
  "product_id": 44,
  "compartment_id": 901,
  "user_id": "9f0a9c7d-6f3e-4c9e-8b18-2c0af3eaa5df",
  "start_at": "2025-12-26T10:00:00.000Z",
  "end_at": "2025-12-26T12:00:00.000Z",
  "status": "pending",
  "total_price": 1200,
  "deposit": 5000,
  "pending_expires_at": "2025-12-26T09:15:00.000Z",
  "created_at": "2025-12-26T09:00:00.000Z",
  "updated_at": "2025-12-26T09:00:00.000Z"
}
```

### `GET /api/calendar/events?from=...&to=...&locker_id=...`

```json
[
  {
    "id": 8123,
    "title": "Booking #8123",
    "start_at": "2025-12-26T10:00:00.000Z",
    "end_at": "2025-12-26T12:00:00.000Z",
    "scope": "booking",
    "status": "paid",
    "meta": { "booking_id": 8123, "product_id": 44, "compartment_id": 901, "locker_id": 7, "total_price": 1200, "deposit": 5000 }
  },
  {
    "id": 55,
    "title": "Maintenance: Door sensor replace",
    "start_at": "2025-12-26T12:00:00.000Z",
    "end_at": "2025-12-26T14:00:00.000Z",
    "scope": "maintenance",
    "status": "active",
    "meta": { "reason": "Sensor replacement" }
  }
]
```

## ICS export (sample structure)

Your ICS endpoint should return `text/calendar` with a structure like:

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rentbox.ee//Booking Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Rentbox (locker 7)
X-WR-TIMEZONE:Europe/Tallinn
BEGIN:VEVENT
UID:booking-8123@rentbox.ee
DTSTAMP:20251226T090000Z
DTSTART:20251226T100000Z
DTEND:20251226T120000Z
SUMMARY:Booking #8123 (paid)
DESCRIPTION:Product 44 | Compartment 901
END:VEVENT
BEGIN:VEVENT
UID:block-55@rentbox.ee
DTSTAMP:20251226T090000Z
DTSTART:20251226T120000Z
DTEND:20251226T140000Z
SUMMARY:Maintenance: Door sensor replace
END:VEVENT
END:VCALENDAR
```

Token handling is modeled by `ics_tokens` in `rentbox/migrations/001_init.sql` (store SHA-256 hash of the raw token).

## Operational reliability (race-safe patterns)

- **DB is the arbiter**:
  - The exclusion constraint prevents overlap in all race scenarios (even with multiple app instances).
- **Create pending is retry-safe**:
  - Use `idempotency_key` and implement creation via `rentbox_create_pending_booking()` (see `rentbox/migrations/002_functions.sql`).
- **Maintenance blocks override**:
  - Booking creation checks `calendar_events` for locker/compartment blocks inside the same transaction.
- **Sweeps for TTL/overdue**:
  - `rentbox_expire_pending()` and `rentbox_mark_overdue()` can be run by cron/queue.

## Timezone handling (Europe/Tallinn)

- Store all times as `timestamptz`.
- Always accept/emit ISO timestamps with offset or `Z`.
- When generating day slots, generate *local wall-clock times* in `tz` and convert to `timestamptz` (see `make_timestamptz` in `rentbox/sql/slots.sql`).
