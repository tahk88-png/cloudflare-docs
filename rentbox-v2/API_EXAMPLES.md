# Rentbox v2 API Examples

## Authentication

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

### Using Token
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Bookings

### Create Booking
```bash
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
  "start_at": "2024-01-15T10:00:00+02:00",
  "end_at": "2024-01-15T18:00:00+02:00"
}

Response: 201 Created
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "880e8400-e29b-41d4-a716-446655440003",
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
  "start_at": "2024-01-15T10:00:00Z",
  "end_at": "2024-01-15T18:00:00Z",
  "status": "pending",
  "total_price": "50.00",
  "deposit_amount": "100.00",
  "currency": "EUR",
  "created_at": "2024-01-14T12:00:00Z",
  "updated_at": "2024-01-14T12:00:00Z",
  "expires_at": "2024-01-14T12:15:00Z",
  "product": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Drill",
    "slug": "drill"
  },
  "compartment": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "number": "A1",
    "locker": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Tallinn Center",
      "location_address": "Narva mnt 1, Tallinn"
    }
  }
}
```

### Check Availability
```bash
POST /api/bookings/availability
Authorization: Bearer <token>
Content-Type: application/json

{
  "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
  "start_at": "2024-01-15T10:00:00+02:00",
  "end_at": "2024-01-15T18:00:00+02:00"
}

Response: 200 OK
{
  "available": true,
  "conflicts": [],
  "maintenance_blocks": []
}

// If not available:
{
  "available": false,
  "conflicts": [
    {
      "booking_id": "aa0e8400-e29b-41d4-a716-446655440005",
      "start_at": "2024-01-15T14:00:00Z",
      "end_at": "2024-01-15T20:00:00Z",
      "status": "paid"
    }
  ],
  "maintenance_blocks": []
}
```

### Get User Bookings
```bash
GET /api/bookings
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "active",
    "start_at": "2024-01-15T10:00:00Z",
    "end_at": "2024-01-15T18:00:00Z",
    "product": {
      "name": "Drill",
      "slug": "drill"
    },
    "compartment": {
      "number": "A1",
      "locker": {
        "name": "Tallinn Center"
      }
    }
  }
]
```

### Extend Booking
```bash
POST /api/bookings/770e8400-e29b-41d4-a716-446655440002/extend
Authorization: Bearer <token>
Content-Type: application/json

{
  "new_end_at": "2024-01-15T20:00:00+02:00"
}

Response: 200 OK
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "end_at": "2024-01-15T20:00:00Z",
  "total_price": "75.00", // Increased by extension fee
  ...
}
```

---

## Calendar

### Get Availability Slots
```bash
GET /api/calendar/availability?compartment_id=660e8400-e29b-41d4-a716-446655440001&start_date=2024-01-15&end_date=2024-01-20

Response: 200 OK
{
  "slots": [
    {
      "start_at": "2024-01-15T08:00:00Z",
      "end_at": "2024-01-15T09:00:00Z",
      "available": true
    },
    {
      "start_at": "2024-01-15T09:00:00Z",
      "end_at": "2024-01-15T10:00:00Z",
      "available": false
    },
    ...
  ]
}
```

### Find Next Available
```bash
GET /api/calendar/next-available/660e8400-e29b-41d4-a716-446655440001?duration_hours=8

Response: 200 OK
{
  "start_at": "2024-01-16T10:00:00Z",
  "end_at": "2024-01-16T18:00:00Z"
}

// Or null if no availability:
null
```

---

## Locker Access

### Open Compartment
```bash
POST /api/lockers/990e8400-e29b-41d4-a716-446655440004/compartments/660e8400-e29b-41d4-a716-446655440001/open
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "method": "mqtt",
  "event_id": "770e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-01-15T10:00:15Z"
}

// On failure:
Response: 400 Bad Request
{
  "statusCode": 400,
  "message": "Failed to open compartment. Support has been notified.",
  "error": "Bad Request"
}
```

### Get Locker Status
```bash
GET /api/lockers/990e8400-e29b-41d4-a716-446655440004
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "name": "Tallinn Center",
  "location_address": "Narva mnt 1, Tallinn",
  "location_lat": "59.4370",
  "location_lng": "24.7536",
  "status": "active",
  "last_seen_at": "2024-01-15T09:55:00Z",
  "compartments": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "number": "A1",
      "status": "occupied",
      "product_locations": [
        {
          "product": {
            "name": "Drill",
            "slug": "drill"
          },
          "quantity": 1
        }
      ]
    }
  ]
}
```

---

## Error Responses

### Conflict (409)
```json
{
  "statusCode": 409,
  "message": "Compartment not available for selected time range",
  "error": "Conflict"
}
```

### Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Booking not found",
  "error": "Not Found"
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": [
    "start_at must be a valid ISO 8601 date string",
    "end_at must be after start_at"
  ],
  "error": "Bad Request"
}
```

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Authenticated: 200 requests per minute per user
- Configurable per endpoint

---

## Webhooks (Future)

### Booking Status Changed
```json
{
  "event": "booking.status_changed",
  "data": {
    "booking_id": "770e8400-e29b-41d4-a716-446655440002",
    "old_status": "paid",
    "new_status": "active",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Access Event
```json
{
  "event": "compartment.opened",
  "data": {
    "booking_id": "770e8400-e29b-41d4-a716-446655440002",
    "compartment_id": "660e8400-e29b-41d4-a716-446655440001",
    "method": "mqtt",
    "timestamp": "2024-01-15T10:00:15Z"
  }
}
```

---

**End of API Examples**
