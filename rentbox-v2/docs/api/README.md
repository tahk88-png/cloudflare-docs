# Rentbox v2 - API Reference

> RESTful API with OpenAPI 3.0 specification. All endpoints are versioned under `/api/v1/`.

## Base URL

```
Production: https://api.rentbox.ee/api/v1
Staging:    https://api.staging.rentbox.ee/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

Tokens are obtained via the authentication flow (OAuth 2.0 / OpenID Connect).

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token (*except public endpoints) |
| `Content-Type` | Yes | `application/json` |
| `Accept` | No | `application/json` |
| `X-Request-ID` | No | Client-generated request ID for tracing |
| `X-Idempotency-Key` | No | For POST/PUT requests requiring idempotency |
| `Accept-Language` | No | `et`, `en`, `ru` (default: `et`) |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is no longer available",
    "details": {
      "field": "start_at",
      "conflicting_booking": "RB-2024-000123"
    },
    "suggested_action": "Please select a different time slot"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BOOKING_CONFLICT` | 409 | Time slot unavailable |
| `PAYMENT_REQUIRED` | 402 | Payment needed to proceed |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## API Modules

1. [Authentication](#authentication-api)
2. [Users](#users-api)
3. [Catalog](#catalog-api)
4. [Locations](#locations-api)
5. [Bookings](#bookings-api)
6. [Payments](#payments-api)
7. [Lockers](#lockers-api)
8. [Notifications](#notifications-api)
9. [Incidents](#incidents-api)
10. [Admin](#admin-api)

---

## Authentication API

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "jaan.tamm@email.ee",
  "password": "SecurePass123!",
  "first_name": "Jaan",
  "last_name": "Tamm",
  "phone": "+37256123456",
  "locale": "et-EE"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "jaan.tamm@email.ee",
      "first_name": "Jaan",
      "last_name": "Tamm",
      "email_verified": false
    },
    "message": "Verification email sent"
  }
}
```

### POST /auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "jaan.tamm@email.ee",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "usr_abc123",
      "email": "jaan.tamm@email.ee",
      "first_name": "Jaan",
      "last_name": "Tamm",
      "roles": ["customer"]
    }
  }
}
```

### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

### POST /auth/logout

Invalidate current session.

---

## Users API

### GET /users/me

Get current user profile.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "jaan.tamm@email.ee",
    "phone": "+37256123456",
    "first_name": "Jaan",
    "last_name": "Tamm",
    "user_type": "individual",
    "email_verified": true,
    "phone_verified": true,
    "notification_preferences": {
      "email": true,
      "sms": true
    },
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### PATCH /users/me

Update current user profile.

**Request:**
```json
{
  "phone": "+37256999999",
  "notification_preferences": {
    "email": true,
    "sms": false
  }
}
```

### GET /users/me/bookings

Get current user's bookings.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (active, completed, etc.) |
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 20, max: 100) |

---

## Catalog API

### GET /products

List all available products.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Category slug |
| `location_id` | uuid | Filter by location |
| `q` | string | Search query |
| `min_price` | number | Minimum daily rate |
| `max_price` | number | Maximum daily rate |
| `sort` | string | `price_asc`, `price_desc`, `name`, `popular` |
| `page` | number | Page number |
| `per_page` | number | Items per page |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_abc123",
      "sku": "DRILL-001",
      "name": "Bosch Professional Drill GSB 18V",
      "slug": "bosch-professional-drill-gsb-18v",
      "short_description": "18V cordless combi drill with 2x batteries",
      "category": {
        "id": "cat_drills",
        "name": "Drills",
        "slug": "drills"
      },
      "images": [
        {
          "url": "https://cdn.rentbox.ee/products/drill-001-1.jpg",
          "alt": "Bosch GSB 18V front view"
        }
      ],
      "pricing": {
        "hourly_rate": "3.50",
        "daily_rate": "15.00",
        "weekly_rate": "75.00",
        "deposit_amount": "50.00",
        "currency": "EUR"
      },
      "availability": {
        "available_now": true,
        "next_available": null,
        "locations_count": 3
      }
    }
  ],
  "pagination": { ... }
}
```

### GET /products/{slug}

Get product details.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "prod_abc123",
    "sku": "DRILL-001",
    "name": "Bosch Professional Drill GSB 18V",
    "slug": "bosch-professional-drill-gsb-18v",
    "description": "Professional-grade 18V cordless combi drill...",
    "specifications": {
      "voltage": "18V",
      "torque": "63 Nm",
      "weight": "1.9 kg",
      "chuck": "13mm",
      "battery": "2x 4.0Ah"
    },
    "images": [ ... ],
    "videos": [ ... ],
    "documents": [
      {
        "type": "manual",
        "name": "User Manual",
        "url": "https://cdn.rentbox.ee/docs/drill-001-manual.pdf"
      }
    ],
    "pricing": {
      "hourly_rate": "3.50",
      "daily_rate": "15.00",
      "weekly_rate": "75.00",
      "deposit_amount": "50.00",
      "currency": "EUR"
    },
    "rental_rules": {
      "min_rental_hours": 2,
      "max_rental_days": 14,
      "buffer_minutes": 30,
      "requires_deposit": true,
      "requires_id_verification": false,
      "min_age": 18
    },
    "locations": [
      {
        "id": "loc_abc123",
        "name": "Tallinn Keskus",
        "available_now": true,
        "next_available": null
      }
    ],
    "related_products": [ ... ],
    "seo": {
      "meta_title": "Rent Bosch GSB 18V Drill | Rentbox",
      "meta_description": "Rent professional Bosch drill...",
      "schema_org": { ... }
    }
  }
}
```

### GET /products/{slug}/availability

Check product availability.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location_id` | uuid | Yes | Location to check |
| `start_at` | datetime | Yes | Desired start time (ISO 8601) |
| `end_at` | datetime | Yes | Desired end time (ISO 8601) |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "available": true,
    "product_id": "prod_abc123",
    "location_id": "loc_abc123",
    "requested_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00"
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3",
      "locker_code": "L001"
    },
    "pricing_estimate": {
      "duration_hours": 8,
      "subtotal": "15.00",
      "deposit": "50.00",
      "tax": "3.00",
      "total": "68.00",
      "currency": "EUR"
    }
  }
}
```

**Response (Unavailable):** `200 OK`
```json
{
  "success": true,
  "data": {
    "available": false,
    "product_id": "prod_abc123",
    "location_id": "loc_abc123",
    "requested_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00"
    },
    "conflict": {
      "type": "booking_exists",
      "blocked_until": "2024-01-20T14:30:00+02:00"
    },
    "alternatives": [
      {
        "start_at": "2024-01-20T15:00:00+02:00",
        "end_at": "2024-01-20T23:00:00+02:00"
      },
      {
        "start_at": "2024-01-21T09:00:00+02:00",
        "end_at": "2024-01-21T17:00:00+02:00"
      }
    ]
  }
}
```

### GET /categories

List all categories.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_power_tools",
      "name": "Power Tools",
      "slug": "power-tools",
      "icon": "power-drill",
      "product_count": 45,
      "children": [
        {
          "id": "cat_drills",
          "name": "Drills",
          "slug": "drills",
          "product_count": 12
        }
      ]
    }
  ]
}
```

---

## Locations API

### GET /locations

List all locations.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `city` | string | Filter by city |
| `lat` | number | Latitude for distance sorting |
| `lng` | number | Longitude for distance sorting |
| `radius_km` | number | Maximum distance in km |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "loc_abc123",
      "code": "TLN-001",
      "name": "Tallinn Keskus",
      "slug": "tallinn-keskus",
      "address": {
        "street": "Viru väljak 4",
        "city": "Tallinn",
        "postal_code": "10111",
        "country": "EE"
      },
      "coordinates": {
        "latitude": 59.4370,
        "longitude": 24.7536
      },
      "is_24h": true,
      "operating_hours": {
        "monday": { "open": "00:00", "close": "23:59" },
        ...
      },
      "status": "active",
      "distance_km": 1.5,
      "available_products_count": 28
    }
  ]
}
```

### GET /locations/{slug}

Get location details.

### GET /locations/{slug}/products

Get products available at location.

---

## Bookings API

### POST /bookings

Create a new booking.

**Headers:**
```http
X-Idempotency-Key: booking_create_user123_1705312800
```

**Request:**
```json
{
  "product_id": "prod_abc123",
  "location_id": "loc_abc123",
  "start_at": "2024-01-20T09:00:00+02:00",
  "end_at": "2024-01-20T17:00:00+02:00",
  "notes": "First time using this drill"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "book_xyz789",
    "booking_number": "RB-2024-000456",
    "status": "pending",
    "product": {
      "id": "prod_abc123",
      "name": "Bosch Professional Drill GSB 18V",
      "image": "https://cdn.rentbox.ee/products/drill-001-1.jpg"
    },
    "location": {
      "id": "loc_abc123",
      "name": "Tallinn Keskus",
      "address": "Viru väljak 4, Tallinn"
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3",
      "locker_code": "L001"
    },
    "time_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00",
      "duration_hours": 8
    },
    "pricing": {
      "subtotal": "15.00",
      "deposit_amount": "50.00",
      "tax_amount": "3.00",
      "total_amount": "68.00",
      "currency": "EUR"
    },
    "expires_at": "2024-01-15T10:45:00+02:00",
    "requires_signature": true,
    "signature_type_required": "typed",
    "checkout_url": "https://rentbox.ee/checkout/book_xyz789",
    "created_at": "2024-01-15T10:30:00+02:00"
  }
}
```

**Error Response (Conflict):** `409 Conflict`
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is no longer available",
    "details": {
      "requested_start": "2024-01-20T09:00:00+02:00",
      "requested_end": "2024-01-20T17:00:00+02:00",
      "blocked_until": "2024-01-20T14:30:00+02:00"
    },
    "suggested_action": "The earliest available time is 15:00. Would you like to book from 15:00-23:00 instead?"
  }
}
```

### GET /bookings/{id}

Get booking details.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "book_xyz789",
    "booking_number": "RB-2024-000456",
    "status": "confirmed",
    "product": { ... },
    "location": { ... },
    "compartment": { ... },
    "time_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00",
      "picked_up_at": null,
      "returned_at": null
    },
    "pricing": { ... },
    "payment": {
      "status": "captured",
      "method": "card",
      "last_four": "4242"
    },
    "deposit": {
      "status": "held",
      "amount": "50.00"
    },
    "contract": {
      "signed_at": "2024-01-15T10:35:00+02:00",
      "signature_type": "typed",
      "pdf_url": "https://cdn.rentbox.ee/contracts/book_xyz789.pdf"
    },
    "access": {
      "pin": "847293",
      "valid_from": "2024-01-20T08:30:00+02:00",
      "valid_until": "2024-01-20T18:00:00+02:00",
      "instructions": "Enter PIN on the locker keypad at compartment A3"
    },
    "timeline": [
      {
        "event": "created",
        "timestamp": "2024-01-15T10:30:00+02:00"
      },
      {
        "event": "contract_signed",
        "timestamp": "2024-01-15T10:35:00+02:00"
      },
      {
        "event": "payment_captured",
        "timestamp": "2024-01-15T10:36:00+02:00"
      },
      {
        "event": "confirmed",
        "timestamp": "2024-01-15T10:36:00+02:00"
      }
    ]
  }
}
```

### POST /bookings/{id}/extend

Request booking extension.

**Request:**
```json
{
  "new_end_at": "2024-01-20T21:00:00+02:00"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "extension_id": "ext_abc123",
    "original_end_at": "2024-01-20T17:00:00+02:00",
    "new_end_at": "2024-01-20T21:00:00+02:00",
    "additional_hours": 4,
    "additional_amount": "14.00",
    "status": "pending_payment",
    "payment_url": "https://rentbox.ee/pay/ext_abc123"
  }
}
```

**Error (Conflict):** `409 Conflict`
```json
{
  "success": false,
  "error": {
    "code": "EXTENSION_CONFLICT",
    "message": "Cannot extend: another booking starts at 18:00",
    "details": {
      "max_extension_until": "2024-01-20T17:30:00+02:00"
    }
  }
}
```

### POST /bookings/{id}/cancel

Cancel a booking.

**Request:**
```json
{
  "reason": "Plans changed"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "book_xyz789",
    "status": "cancelled",
    "refund": {
      "amount": "68.00",
      "status": "processing",
      "expected_by": "2024-01-18T00:00:00+02:00"
    }
  }
}
```

### POST /bookings/{id}/return

Initiate return process.

**Request:**
```json
{
  "condition_notes": "All good, no issues",
  "photos": [
    "https://uploads.rentbox.ee/returns/photo1.jpg"
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "book_xyz789",
    "status": "completed",
    "returned_at": "2024-01-20T16:45:00+02:00",
    "deposit_release": {
      "status": "processing",
      "amount": "50.00",
      "expected_by": "2024-01-25T00:00:00+02:00"
    },
    "message": "Thank you for returning the equipment! Your deposit will be refunded within 3-5 business days."
  }
}
```

---

## Payments API

### POST /payments/checkout

Create checkout session for booking.

**Request:**
```json
{
  "booking_id": "book_xyz789",
  "payment_method": "card",
  "return_url": "https://rentbox.ee/booking/book_xyz789/confirmed"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "checkout_session_id": "cs_abc123",
    "payment_url": "https://checkout.stripe.com/pay/cs_abc123",
    "expires_at": "2024-01-15T11:00:00+02:00"
  }
}
```

### POST /payments/webhook

Stripe/payment provider webhook endpoint.

### GET /payments/{id}

Get payment details.

---

## Lockers API

### POST /lockers/{compartment_id}/open

Request to open compartment door.

**Request:**
```json
{
  "booking_id": "book_xyz789",
  "access_type": "pickup"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "compartment_id": "comp_xyz789",
    "door_status": "opening",
    "message": "Door is opening. Please retrieve your item within 60 seconds."
  }
}
```

**Error (Not authorized):** `403 Forbidden`
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You cannot access this compartment",
    "details": {
      "reason": "Booking not yet active",
      "booking_starts_at": "2024-01-20T09:00:00+02:00"
    }
  }
}
```

### GET /lockers/{locker_id}/status

Get locker status (admin only).

---

## Notifications API

### GET /notifications

Get user's notifications.

### PATCH /notifications/{id}/read

Mark notification as read.

### PUT /users/me/notification-preferences

Update notification preferences.

**Request:**
```json
{
  "email": {
    "booking_confirmed": true,
    "return_reminder": true,
    "marketing": false
  },
  "sms": {
    "booking_confirmed": true,
    "return_reminder": true,
    "overdue_warning": true
  }
}
```

---

## Incidents API

### POST /incidents

Report an incident.

**Request:**
```json
{
  "booking_id": "book_xyz789",
  "type": "tool_damaged",
  "title": "Drill bit broken",
  "description": "The main drill bit was broken when I received the tool",
  "photos": [
    "https://uploads.rentbox.ee/incidents/photo1.jpg"
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "inc_abc123",
    "incident_number": "INC-2024-0042",
    "status": "open",
    "message": "Your incident has been reported. We will respond within 24 hours."
  }
}
```

### GET /incidents/{id}

Get incident details.

### POST /incidents/{id}/comments

Add comment to incident.

---

## Admin API

All admin endpoints require `admin` or `operator` role.

### GET /admin/bookings

List all bookings with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `location_id` | uuid | Filter by location |
| `date_from` | date | Start date filter |
| `date_to` | date | End date filter |
| `overdue` | boolean | Show only overdue |

### GET /admin/dashboard

Get dashboard statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "today": {
      "active_rentals": 42,
      "pickups_scheduled": 15,
      "returns_expected": 18,
      "overdue": 2,
      "revenue": "1,245.00"
    },
    "alerts": [
      {
        "type": "overdue",
        "booking_number": "RB-2024-000123",
        "overdue_by": "2 hours",
        "customer": "Jaan Tamm"
      },
      {
        "type": "locker_offline",
        "locker_code": "L003",
        "location": "Tartu Keskus",
        "since": "2024-01-15T08:00:00+02:00"
      }
    ],
    "recent_activity": [ ... ]
  }
}
```

### GET /admin/lockers

List all lockers with status.

### POST /admin/lockers/{id}/maintenance

Put locker in maintenance mode.

### GET /admin/incidents

List all incidents.

### PATCH /admin/incidents/{id}

Update incident (assign, resolve, etc.).

### GET /admin/users

List users.

### PATCH /admin/users/{id}/roles

Update user roles.

---

## Webhooks

Rentbox can send webhooks for the following events:

| Event | Description |
|-------|-------------|
| `booking.created` | New booking created |
| `booking.confirmed` | Booking payment completed |
| `booking.started` | Rental period started |
| `booking.completed` | Equipment returned |
| `booking.overdue` | Rental is overdue |
| `booking.cancelled` | Booking cancelled |
| `locker.door_opened` | Compartment door opened |
| `locker.door_closed` | Compartment door closed |
| `incident.created` | New incident reported |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "booking.confirmed",
  "created_at": "2024-01-15T10:36:00Z",
  "data": {
    "booking_id": "book_xyz789",
    "booking_number": "RB-2024-000456",
    ...
  }
}
```

### Webhook Signature

All webhooks include a signature header for verification:

```http
X-Rentbox-Signature: sha256=abc123...
```

Verify by computing HMAC-SHA256 of the raw body with your webhook secret.

---

## Rate Limits

| Endpoint Type | Rate Limit |
|---------------|------------|
| Public (catalog, locations) | 100 req/min |
| Authenticated | 300 req/min |
| Booking creation | 10 req/min |
| Admin | 600 req/min |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312860
```

---

## SDKs & Libraries

- [JavaScript/TypeScript SDK](https://github.com/rentbox/sdk-js)
- [OpenAPI Spec](https://api.rentbox.ee/openapi.json)
- [Postman Collection](https://www.postman.com/rentbox/workspace)
