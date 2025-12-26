# API Contracts - Rentbox v2

Complete REST API specification for all system modules.

## General Conventions

### Base URL
```
Production: https://api.rentbox.ee/v2
Staging: https://api-staging.rentbox.ee/v2
```

### Authentication
```http
Authorization: Bearer {jwt_token}
```

### Request Headers
```http
Content-Type: application/json
X-Idempotency-Key: {uuid} # For critical operations
X-Request-ID: {uuid} # For tracing
```

### Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_123abc",
    "timestamp": "2024-12-26T10:30:00Z"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is already booked.",
    "details": { ... },
    "action": "Please select a different time.",
    "next_available": "2024-12-27T10:00:00Z"
  },
  "meta": {
    "request_id": "req_123abc",
    "timestamp": "2024-12-26T10:30:00Z"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., double booking)
- `422` - Unprocessable Entity (business rule violation)
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Pagination
```http
GET /api/v2/bookings?page=1&limit=20&sort=created_at:desc
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## 1. Authentication & User Management

### POST /auth/register
**Register new user**

**Request:**
```json
{
  "email": "user@example.com",
  "phone": "+37255512345",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "is_business": false
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer",
      "email_verified": false
    },
    "session": {
      "token": "jwt_token_here",
      "expires_at": "2024-12-27T10:30:00Z"
    }
  }
}
```

---

### POST /auth/login
**User authentication**

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { ... },
    "session": {
      "token": "jwt_token_here",
      "expires_at": "2024-12-27T10:30:00Z"
    }
  }
}
```

---

### POST /auth/logout
**End session**

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### GET /users/me
**Get current user profile**

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+37255512345",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer",
    "email_verified": true,
    "phone_verified": true,
    "is_business": false,
    "created_at": "2024-01-15T08:00:00Z"
  }
}
```

---

### PATCH /users/me
**Update user profile**

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+37255599999"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+37255599999",
    "updated_at": "2024-12-26T10:30:00Z"
  }
}
```

---

## 2. Product Catalog

### GET /products
**List all products**

**Query Parameters:**
- `category_id` (optional)
- `location_id` (optional)
- `search` (optional)
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Bosch Hammer Drill GBH 2-28 F",
      "slug": "bosch-hammer-drill-gbh-2-28-f",
      "sku": "TOOL-001",
      "description": "Professional hammer drill...",
      "price_per_hour": 500,
      "price_per_day": 2500,
      "deposit_amount": 10000,
      "images": [
        "https://cdn.rentbox.ee/products/tool-001-1.jpg"
      ],
      "specifications": {
        "power": "880W",
        "weight": "3.9kg",
        "max_drilling_diameter": "28mm"
      },
      "category": {
        "id": "uuid",
        "name": "Power Tools",
        "slug": "power-tools"
      },
      "is_active": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

### GET /products/:slug
**Get product details**

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Bosch Hammer Drill GBH 2-28 F",
    "slug": "bosch-hammer-drill-gbh-2-28-f",
    "sku": "TOOL-001",
    "description": "Professional hammer drill with SDS-plus...",
    "price_per_hour": 500,
    "price_per_day": 2500,
    "deposit_amount": 10000,
    "images": ["..."],
    "videos": ["..."],
    "specifications": { ... },
    "category": { ... },
    "available_at_locations": [
      {
        "location_id": "uuid",
        "location_name": "Tallinn Central",
        "available_count": 3
      }
    ]
  }
}
```

---

## 3. Availability & Booking

### POST /availability/check
**Check availability for time slot**

**Request:**
```json
{
  "product_id": "uuid",
  "location_id": "uuid",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z"
}
```

**Response (200):**
```json
{
  "data": {
    "available": true,
    "compartments": [
      {
        "compartment_id": "uuid",
        "compartment_number": "C-05",
        "locker_code": "L-001",
        "product_instance_id": "uuid"
      }
    ],
    "pricing": {
      "duration_hours": 4,
      "price_per_hour": 500,
      "total_rental_cost": 2000,
      "deposit_amount": 10000,
      "total_due": 12000,
      "currency": "EUR"
    }
  }
}
```

**Response (200) - Not available:**
```json
{
  "data": {
    "available": false,
    "next_available": "2024-12-27T15:00:00Z",
    "reason": "All compartments booked during this time"
  }
}
```

---

### POST /availability/next-available
**Find next available time slot**

**Request:**
```json
{
  "product_id": "uuid",
  "location_id": "uuid",
  "duration_hours": 4,
  "from": "2024-12-27T10:00:00Z"
}
```

**Response (200):**
```json
{
  "data": {
    "start_at": "2024-12-27T15:00:00Z",
    "end_at": "2024-12-27T19:00:00Z",
    "compartment_id": "uuid",
    "pricing": { ... }
  }
}
```

---

### POST /bookings
**Create a new booking**

**Headers:**
- `Authorization: Bearer {token}`
- `X-Idempotency-Key: {uuid}` (REQUIRED)

**Request:**
```json
{
  "product_id": "uuid",
  "location_id": "uuid",
  "compartment_id": "uuid",
  "start_at": "2024-12-27T10:00:00Z",
  "end_at": "2024-12-27T14:00:00Z"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "booking_number": "BK-2024-001234",
    "status": "pending",
    "user_id": "uuid",
    "product": {
      "id": "uuid",
      "name": "Bosch Hammer Drill GBH 2-28 F",
      "images": ["..."]
    },
    "location": {
      "id": "uuid",
      "name": "Tallinn Central",
      "address": "..."
    },
    "compartment": {
      "id": "uuid",
      "number": "C-05",
      "locker_code": "L-001"
    },
    "start_at": "2024-12-27T10:00:00Z",
    "end_at": "2024-12-27T14:00:00Z",
    "pricing": {
      "price_per_hour": 500,
      "total_rental_cost": 2000,
      "deposit_amount": 10000,
      "total_due": 12000,
      "currency": "EUR"
    },
    "expires_at": "2024-12-26T10:45:00Z",
    "created_at": "2024-12-26T10:30:00Z"
  }
}
```

**Error (409) - Conflict:**
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is no longer available.",
    "details": {
      "compartment_id": "uuid",
      "conflicting_booking": "BK-2024-001233"
    },
    "action": "Please select a different time or compartment.",
    "next_available": "2024-12-27T15:00:00Z"
  }
}
```

---

### GET /bookings/:id
**Get booking details**

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "booking_number": "BK-2024-001234",
    "status": "active",
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "user@example.com",
      "phone": "+37255512345"
    },
    "product": { ... },
    "location": { ... },
    "compartment": { ... },
    "start_at": "2024-12-27T10:00:00Z",
    "end_at": "2024-12-27T14:00:00Z",
    "actual_start_at": "2024-12-27T10:05:23Z",
    "actual_end_at": null,
    "pricing": { ... },
    "payment": {
      "id": "uuid",
      "status": "completed",
      "amount": 12000,
      "paid_at": "2024-12-26T10:32:15Z"
    },
    "agreement": {
      "id": "uuid",
      "signed_at": "2024-12-26T10:31:45Z",
      "signature_type": "smart_id"
    },
    "access": {
      "pickup_pin": "1234",
      "return_pin": "5678",
      "pin_expires_at": "2024-12-27T14:15:00Z"
    },
    "time_remaining_seconds": 12345,
    "created_at": "2024-12-26T10:30:00Z",
    "updated_at": "2024-12-27T10:05:23Z"
  }
}
```

---

### GET /bookings
**List user's bookings**

**Query Parameters:**
- `status` (optional: pending, paid, active, completed, overdue, cancelled)
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "booking_number": "BK-2024-001234",
      "status": "active",
      "product": {
        "name": "Bosch Hammer Drill",
        "image": "https://..."
      },
      "location": {
        "name": "Tallinn Central"
      },
      "start_at": "2024-12-27T10:00:00Z",
      "end_at": "2024-12-27T14:00:00Z",
      "time_remaining_seconds": 12345,
      "total_cost": 2000
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### POST /bookings/:id/extend
**Extend booking duration**

**Request:**
```json
{
  "new_end_at": "2024-12-27T16:00:00Z"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "booking_number": "BK-2024-001234",
    "original_end_at": "2024-12-27T14:00:00Z",
    "new_end_at": "2024-12-27T16:00:00Z",
    "extension_cost": 1000,
    "payment_required": true,
    "payment": {
      "amount": 1000,
      "payment_url": "https://payment-provider.com/pay/xyz"
    }
  }
}
```

**Error (409):**
```json
{
  "error": {
    "code": "EXTENSION_CONFLICT",
    "message": "Cannot extend: compartment is booked after your current end time.",
    "details": {
      "current_end_at": "2024-12-27T14:00:00Z",
      "requested_end_at": "2024-12-27T16:00:00Z",
      "next_booking_starts_at": "2024-12-27T15:00:00Z"
    },
    "action": "Maximum extension: 2024-12-27T15:00:00Z"
  }
}
```

---

### POST /bookings/:id/cancel
**Cancel booking**

**Request:**
```json
{
  "reason": "Changed plans"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "booking_number": "BK-2024-001234",
    "status": "cancelled",
    "refund": {
      "amount": 12000,
      "processing": true,
      "estimated_arrival": "2024-12-29T10:00:00Z"
    },
    "cancelled_at": "2024-12-26T11:00:00Z"
  }
}
```

---

## 4. Digital Signing & Checkout

### POST /agreements/sign
**Sign rental agreement**

**Request (Typed signature):**
```json
{
  "booking_id": "uuid",
  "signature_type": "typed",
  "signature_value": "John Doe",
  "terms_accepted": true,
  "terms_version": "v2.1"
}
```

**Request (Smart-ID):**
```json
{
  "booking_id": "uuid",
  "signature_type": "smart_id",
  "national_id": "38001010021"
}
```

**Response (201) - Typed:**
```json
{
  "data": {
    "id": "uuid",
    "booking_id": "uuid",
    "signature_type": "typed",
    "signed_at": "2024-12-26T10:31:45Z",
    "is_valid": true,
    "content_hash": "abc123..."
  }
}
```

**Response (202) - Smart-ID (requires polling):**
```json
{
  "data": {
    "session_id": "smart-id-session-123",
    "verification_code": "1234",
    "status": "pending",
    "poll_url": "/agreements/sign/smart-id-session-123/status",
    "expires_at": "2024-12-26T10:33:00Z"
  }
}
```

---

### GET /agreements/sign/:session_id/status
**Check Smart-ID signing status**

**Response (200) - Pending:**
```json
{
  "data": {
    "status": "pending",
    "message": "Waiting for user confirmation on Smart-ID app"
  }
}
```

**Response (200) - Completed:**
```json
{
  "data": {
    "status": "completed",
    "agreement": {
      "id": "uuid",
      "signed_at": "2024-12-26T10:32:01Z",
      "signature_type": "smart_id",
      "is_valid": true
    }
  }
}
```

---

## 5. Payment Processing

### POST /payments/create
**Create payment intent**

**Request:**
```json
{
  "booking_id": "uuid",
  "amount": 12000,
  "method": "card",
  "return_url": "https://rentbox.ee/booking/BK-2024-001234"
}
```

**Response (201):**
```json
{
  "data": {
    "payment_id": "uuid",
    "provider": "stripe",
    "client_secret": "pi_xxx_secret_yyy",
    "payment_url": "https://payment-provider.com/pay/xyz",
    "amount": 12000,
    "currency": "EUR",
    "expires_at": "2024-12-26T10:45:00Z"
  }
}
```

---

### POST /payments/webhook
**Payment provider webhook** (Internal, called by payment provider)

**Request:**
```json
{
  "event_type": "payment.succeeded",
  "payment_id": "uuid",
  "provider_transaction_id": "ch_abc123",
  "amount": 12000,
  "timestamp": "2024-12-26T10:32:15Z"
}
```

**Response (200):**
```json
{
  "data": {
    "received": true
  }
}
```

---

### GET /payments/:id
**Get payment status**

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "booking_id": "uuid",
    "amount": 12000,
    "currency": "EUR",
    "method": "card",
    "status": "completed",
    "provider": "stripe",
    "provider_transaction_id": "ch_abc123",
    "created_at": "2024-12-26T10:31:00Z",
    "completed_at": "2024-12-26T10:32:15Z"
  }
}
```

---

## 6. Locker Access

### POST /access/open
**Open compartment**

**Request:**
```json
{
  "booking_id": "uuid",
  "compartment_id": "uuid",
  "pin": "1234"
}
```

**Response (200) - Success:**
```json
{
  "data": {
    "success": true,
    "compartment": {
      "id": "uuid",
      "number": "C-05",
      "locker_code": "L-001"
    },
    "message": "Compartment opened successfully. Please retrieve your tool.",
    "action": "Close the door securely after removing the tool.",
    "timestamp": "2024-12-27T10:05:23Z"
  }
}
```

**Response (422) - Failed:**
```json
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Cannot open compartment: booking not active",
    "details": {
      "booking_status": "paid",
      "start_at": "2024-12-27T10:00:00Z",
      "current_time": "2024-12-27T09:55:00Z"
    },
    "action": "Access will be available at 10:00 AM"
  }
}
```

**Response (503) - Hardware Error:**
```json
{
  "error": {
    "code": "LOCKER_COMM_TIMEOUT",
    "message": "Failed to communicate with locker",
    "details": {
      "locker_id": "L-001",
      "compartment_id": "C-05",
      "attempts": 3,
      "last_error": "ETIMEDOUT"
    },
    "action": "An incident has been created. Customer support will contact you shortly.",
    "incident_id": "INC-2024-001234",
    "support_phone": "+372 5551 2345"
  }
}
```

---

### GET /access/logs
**Get access history for booking**

**Query Parameters:**
- `booking_id` (required)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "open",
      "method": "pin",
      "success": true,
      "timestamp": "2024-12-27T10:05:23Z"
    },
    {
      "id": "uuid",
      "action": "open_failed",
      "method": "pin",
      "success": false,
      "error_code": "INVALID_PIN",
      "timestamp": "2024-12-27T10:05:10Z"
    }
  ]
}
```

---

## 7. Return Process

### POST /bookings/:id/return
**Initiate return**

**Request:**
```json
{
  "condition_notes": "Tool in good condition, no issues",
  "photos": [
    "https://cdn.rentbox.ee/returns/uuid-1.jpg",
    "https://cdn.rentbox.ee/returns/uuid-2.jpg"
  ]
}
```

**Response (200):**
```json
{
  "data": {
    "booking_id": "uuid",
    "status": "completed",
    "return": {
      "returned_at": "2024-12-27T13:55:00Z",
      "condition_notes": "Tool in good condition",
      "photos": ["..."],
      "requires_verification": false,
      "auto_approved": true
    },
    "refund": {
      "deposit_amount": 10000,
      "processing": true,
      "estimated_arrival": "2024-12-29T10:00:00Z"
    }
  }
}
```

---

### POST /bookings/:id/verify-return
**Admin: Verify return** (Admin only)

**Request:**
```json
{
  "approved": true,
  "admin_notes": "Tool condition confirmed, no damage",
  "damage_fee": 0
}
```

**Response (200):**
```json
{
  "data": {
    "booking_id": "uuid",
    "verified_at": "2024-12-27T14:05:00Z",
    "verified_by": "uuid",
    "approved": true,
    "refund_released": true
  }
}
```

---

## 8. Notifications

### GET /notifications
**List user's notifications**

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "channel": "email",
      "subject": "Your rental starts in 1 hour",
      "status": "delivered",
      "sent_at": "2024-12-27T09:00:00Z",
      "booking_id": "uuid"
    }
  ]
}
```

---

### PATCH /notifications/preferences
**Update notification preferences**

**Request:**
```json
{
  "email_enabled": true,
  "sms_enabled": true,
  "marketing_emails": false
}
```

**Response (200):**
```json
{
  "data": {
    "email_enabled": true,
    "sms_enabled": true,
    "marketing_emails": false
  }
}
```

---

## 9. Incidents (Admin/Operator)

### POST /incidents
**Create incident report**

**Request:**
```json
{
  "severity": "p1",
  "title": "Locker L-001 offline",
  "description": "Cannot communicate with locker at Tallinn Central",
  "locker_id": "uuid",
  "booking_id": null
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "incident_number": "INC-2024-001234",
    "severity": "p1",
    "status": "open",
    "title": "Locker L-001 offline",
    "sla_due_at": "2024-12-26T11:30:00Z",
    "created_at": "2024-12-26T10:30:00Z"
  }
}
```

---

### GET /incidents
**List incidents**

**Query Parameters:**
- `status` (optional)
- `severity` (optional)
- `assigned_to` (optional)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "incident_number": "INC-2024-001234",
      "severity": "p1",
      "status": "investigating",
      "title": "Locker L-001 offline",
      "assigned_to": {
        "id": "uuid",
        "name": "Tech Support"
      },
      "sla_due_at": "2024-12-26T11:30:00Z",
      "created_at": "2024-12-26T10:30:00Z"
    }
  ]
}
```

---

### PATCH /incidents/:id
**Update incident**

**Request:**
```json
{
  "status": "resolved",
  "resolution_notes": "Locker rebooted, connection restored",
  "assigned_to": "uuid"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "resolved",
    "resolved_at": "2024-12-26T11:15:00Z",
    "resolved_by": "uuid"
  }
}
```

---

## 10. Admin APIs

### GET /admin/dashboard/stats
**Get dashboard statistics** (Admin only)

**Response (200):**
```json
{
  "data": {
    "bookings": {
      "active": 12,
      "pending_payment": 3,
      "overdue": 1,
      "today": 25,
      "revenue_today": 45000
    },
    "lockers": {
      "online": 8,
      "offline": 1,
      "maintenance": 0
    },
    "incidents": {
      "open": 2,
      "p0": 0,
      "p1": 1
    }
  }
}
```

---

### GET /admin/bookings
**List all bookings** (Admin only)

**Query Parameters:**
- `status` (optional)
- `location_id` (optional)
- `user_email` (optional)
- `from_date` (optional)
- `to_date` (optional)
- `page` (default: 1)
- `limit` (default: 50)

**Response:** Similar to GET /bookings but includes all users

---

### POST /admin/maintenance-blocks
**Create maintenance block** (Admin only)

**Request:**
```json
{
  "compartment_id": "uuid",
  "start_at": "2024-12-28T08:00:00Z",
  "end_at": "2024-12-28T12:00:00Z",
  "reason": "Annual maintenance"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "compartment_id": "uuid",
    "start_at": "2024-12-28T08:00:00Z",
    "end_at": "2024-12-28T12:00:00Z",
    "reason": "Annual maintenance",
    "created_by": "uuid",
    "created_at": "2024-12-26T10:30:00Z"
  }
}
```

---

## 11. Content Management

### POST /content/pages
**Create content page** (Admin only)

**Request:**
```json
{
  "title": "How to Use a Hammer Drill",
  "slug": "how-to-use-hammer-drill",
  "blocks": [
    {
      "type": "heading",
      "content": "Safety First"
    },
    {
      "type": "text",
      "content": "Always wear safety glasses..."
    },
    {
      "type": "image",
      "url": "https://cdn.rentbox.ee/content/safety.jpg",
      "alt": "Safety equipment"
    }
  ],
  "meta_title": "Hammer Drill Safety Guide",
  "meta_description": "Learn how to safely use a hammer drill"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "title": "How to Use a Hammer Drill",
    "slug": "how-to-use-hammer-drill",
    "version": 1,
    "is_published": false,
    "created_at": "2024-12-26T10:30:00Z"
  }
}
```

---

### POST /content/ai/suggest
**Get AI content suggestions**

**Request:**
```json
{
  "text": "This drill is really good and powerful.",
  "context": "product_description",
  "suggestion_type": "clarity"
}
```

**Response (200):**
```json
{
  "data": {
    "original_text": "This drill is really good and powerful.",
    "suggested_text": "Professional-grade 880W hammer drill suitable for concrete, masonry, and metal drilling.",
    "changes": [
      {
        "type": "specificity",
        "reason": "Added technical specifications"
      },
      {
        "type": "clarity",
        "reason": "Replaced vague terms with specific capabilities"
      }
    ],
    "confidence": 0.92
  }
}
```

---

## Error Codes Reference

### Booking Errors
- `BOOKING_CONFLICT` - Time slot already booked
- `EXTENSION_CONFLICT` - Cannot extend due to next booking
- `BOOKING_NOT_FOUND` - Invalid booking ID
- `BOOKING_ALREADY_CANCELLED` - Cannot modify cancelled booking
- `BOOKING_ALREADY_ACTIVE` - Cannot cancel active rental
- `INVALID_TIME_RANGE` - End time before start time
- `MINIMUM_DURATION` - Booking too short (min 1 hour)
- `MAXIMUM_DURATION` - Booking too long (max 30 days)

### Payment Errors
- `PAYMENT_FAILED` - Payment provider declined
- `PAYMENT_TIMEOUT` - Payment session expired
- `INSUFFICIENT_FUNDS` - Card declined
- `INVALID_CARD` - Invalid card details

### Access Errors
- `ACCESS_DENIED` - Booking not active
- `INVALID_PIN` - Incorrect PIN
- `PIN_EXPIRED` - PIN no longer valid
- `LOCKER_OFFLINE` - Cannot communicate with locker
- `LOCKER_COMM_TIMEOUT` - Hardware timeout
- `COMPARTMENT_STUCK` - Mechanical failure

### Authentication Errors
- `INVALID_CREDENTIALS` - Wrong email/password
- `EMAIL_NOT_VERIFIED` - Email verification required
- `ACCOUNT_SUSPENDED` - User account inactive
- `TOKEN_EXPIRED` - Session expired
- `INSUFFICIENT_PERMISSIONS` - Role-based access denied

---

## Rate Limiting

### Limits by Endpoint Type

**Public endpoints:**
- 60 requests per minute per IP

**Authenticated endpoints:**
- 120 requests per minute per user

**Critical operations (booking, payment):**
- 10 requests per minute per user
- Idempotency keys prevent accidental duplicates

**Response headers:**
```http
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672052400
```

**Response when rate limited (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after_seconds": 45
  }
}
```

---

## Webhooks

### Available Webhook Events

**Bookings:**
- `booking.created`
- `booking.paid`
- `booking.started`
- `booking.completed`
- `booking.overdue`
- `booking.cancelled`

**Payments:**
- `payment.succeeded`
- `payment.failed`
- `payment.refunded`

**Incidents:**
- `incident.created`
- `incident.resolved`

### Webhook Payload Format

```json
{
  "event": "booking.completed",
  "timestamp": "2024-12-27T14:00:00Z",
  "data": {
    "booking_id": "uuid",
    "booking_number": "BK-2024-001234",
    "user_id": "uuid",
    "status": "completed"
  },
  "signature": "sha256=abc123..."
}
```

### Webhook Security

**Verify signature:**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${hash}` === signature;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { RentboxClient } from '@rentbox/sdk';

const client = new RentboxClient({
  apiKey: process.env.RENTBOX_API_KEY,
  environment: 'production'
});

// Check availability
const availability = await client.availability.check({
  productId: 'uuid',
  locationId: 'uuid',
  startAt: '2024-12-27T10:00:00Z',
  endAt: '2024-12-27T14:00:00Z'
});

// Create booking
const booking = await client.bookings.create({
  productId: 'uuid',
  locationId: 'uuid',
  compartmentId: availability.compartments[0].compartmentId,
  startAt: '2024-12-27T10:00:00Z',
  endAt: '2024-12-27T14:00:00Z'
}, {
  idempotencyKey: 'unique-key-123'
});

// Sign agreement
const agreement = await client.agreements.sign({
  bookingId: booking.id,
  signatureType: 'typed',
  signatureValue: 'John Doe',
  termsAccepted: true
});

// Create payment
const payment = await client.payments.create({
  bookingId: booking.id,
  amount: booking.pricing.total_due,
  method: 'card',
  returnUrl: 'https://myapp.com/success'
});
```

---

**API Version**: 2.0.0  
**Last Updated**: 2024-12-26  
**Support**: api-support@rentbox.ee
