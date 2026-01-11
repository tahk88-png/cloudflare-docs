## Rentbox Calendar UI examples

### Customer slot picker

```tsx
import { CustomerCalendar } from "./rentbox/ui/react";

export function ProductPage() {
  return (
    <CustomerCalendar
      productId={44}
      tz="Europe/Tallinn"
      baseUrl="https://api.rentbox.ee"
      onSelectRange={(slot) => {
        // slot.start_at / slot.end_at are ISO strings
        console.log(slot);
      }}
    />
  );
}
```

### Admin operations timeline

```tsx
import { AdminCalendarPage } from "./rentbox/ui/react";

export function AdminOps() {
  return (
    <AdminCalendarPage
      tz="Europe/Tallinn"
      baseUrl="https://api.rentbox.ee"
      lockers={[
        { id: 7, name: "Tartu — Kesk" },
        { id: 8, name: "Tallinn — Ülemiste" }
      ]}
      compartments={[
        { id: 901, code: "A1", locker_id: 7 },
        { id: 902, code: "A2", locker_id: 7 },
        { id: 903, code: "B1", locker_id: 7 }
      ]}
      products={[
        { id: 44, name: "Akutrell" },
        { id: 45, name: "Nurklik" }
      ]}
    />
  );
}
```

### Mock mode (no backend required)

```tsx
<CustomerCalendar productId={44} useMock />
<AdminCalendarPage lockers={[{id: 7, name: "Demo"}]} compartments={[{id: 901, code:"A1", locker_id: 7}]} useMock />
```

### Example JSON

Slots (`GET /api/products/:id/slots?...`):

```json
[
  { "start_at": "2025-12-26T10:00:00.000Z", "end_at": "2025-12-26T12:00:00.000Z", "is_available": true },
  { "start_at": "2025-12-26T10:30:00.000Z", "end_at": "2025-12-26T12:30:00.000Z", "is_available": false }
]
```

Events (`GET /api/calendar/events?...`):

```json
[
  {
    "id": 8123,
    "scope": "booking",
    "status": "paid",
    "title": "Booking #8123",
    "start_at": "2025-12-26T10:00:00.000Z",
    "end_at": "2025-12-26T12:00:00.000Z",
    "locker_id": 7,
    "compartment_id": 901,
    "meta": { "booking_id": 8123, "product_id": 44 }
  },
  {
    "id": 55,
    "scope": "maintenance",
    "status": "active",
    "title": "Maintenance: Door sensor replace",
    "start_at": "2025-12-26T12:00:00.000Z",
    "end_at": "2025-12-26T14:00:00.000Z",
    "locker_id": 7,
    "compartment_id": 901,
    "meta": { "reason": "Sensor replacement" }
  }
]
```

