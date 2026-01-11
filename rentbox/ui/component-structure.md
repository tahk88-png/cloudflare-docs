## Rentbox Calendar UI (React + TypeScript + Tailwind + shadcn/ui)

This file is a **component map + prop contracts** for the calendars you described. The calendar UI is advisory; the server enforces booking reality.

### Customer calendar (product page)

**Goal**: show time-based availability, allow selecting a slot + duration, and show “next available”.

#### Component tree

- `ProductBookingPanel`
  - `CalendarToolbar`
    - date nav (prev/next/today)
    - view switch (month/day)
    - timezone badge (“Europe/Tallinn”)
  - `DurationSelector`
  - `MonthPicker` (optional)
  - `SlotGrid`
    - `SlotButton` (available/unavailable)
    - `SlotSkeleton` (loading)
  - `NextAvailableLink`
  - `BookingSummary`
  - `ConfirmBookingButton`

#### Key props (suggested)

- `SlotGrid`
  - `date: string` (YYYY-MM-DD local)
  - `tz: string` (default `Europe/Tallinn`)
  - `stepMinutes: number` (default 30)
  - `durationMinutes: number`
  - `selectedStartAt?: string` (ISO)
  - `onSelect(slot: { start_at: string; end_at: string }): void`

#### Data flow

- Fetch on date/duration/step change:
  - `GET /api/products/:id/slots?date=...&step_minutes=...&duration_minutes=...&tz=Europe/Tallinn`
- When the user clicks “Next available”:
  - call `GET /api/products/:id/availability?start_at=...&end_at=...`
  - jump calendar to the returned timestamp’s local date/time.

### Admin calendar (operations)

**Goal**: unified view of bookings + blocks, by locker/compartment/product, with fast filtering and actions.

#### Views

1) **Timeline by locker**
- rows = compartments
- columns = time (day/week)
- can also render locker-level blocks on a “locker band” header row

2) **By compartment**
- single resource timeline with full detail

3) **By product (aggregated)**
- show utilization / stacked bars by locker or total

#### Component tree

- `AdminCalendarPage`
  - `CalendarToolbar` (date nav + view switch day/week)
  - `FiltersPanel`
    - locker filter
    - product filter
    - status filter (paid/active/overdue)
    - scope filter (booking/block/maintenance)
  - `TimelineGrid` (locker/compartment views)
    - `ResourceRow` (compartment)
    - `EventCard`
    - `NowIndicator`
    - `GridSkeleton`
  - `EventDrawer`
    - booking detail (status badge, time range, price, compartment/locker)
    - action buttons:
      - start / complete
      - cancel (policy)
      - extend (availability-checked)
  - `BlockDialog`
    - create maintenance block (locker or compartment)

#### Status coloring (example)

- `paid`: blue
- `active`: green
- `overdue`: red + pulsing outline
- `cancelled/expired/completed`: gray (collapsed by default in filters)
- `block/maintenance`: yellow/orange hatch background

#### Data fetching / performance rules

- Debounce filter changes (150–300ms).
- Cache by `{from,to,filters}` and prefetch next/prev week on idle.
- The UI never “assumes” a slot is bookable; it must call booking creation and handle `409`.

### Admin actions (blocks)

- Create:
  - `POST /api/admin/calendar/blocks`
- Delete:
  - `DELETE /api/admin/calendar/blocks/:id`

### Reliability notes (UI)

- Always treat `POST /api/bookings` conflicts as normal (race-safe): show “Just booked by someone else; pick another time” and refresh slots.
- Show countdown on pending bookings using `pending_expires_at` and refresh state.
