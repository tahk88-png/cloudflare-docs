# Rentbox v2 — API Contracts

## Overview

All APIs follow REST conventions with consistent patterns:

- **Base URL**: `https://api.rentbox.ee/v1`
- **Authentication**: Bearer JWT token
- **Content-Type**: `application/json`
- **Timezone**: All timestamps in ISO 8601 with timezone (TIMESTAMPTZ)
- **Idempotency**: POST/PUT/DELETE support `Idempotency-Key` header

---

## Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>              # For tracing
Idempotency-Key: <uuid>           # For safe retries (24h TTL)
X-Timezone: Europe/Tallinn        # For display formatting
```

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot was just booked by another customer.",
    "action": "Please select a different time.",
    "details": { ... },
    "alternatives": [ ... ]
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `SLOT_UNAVAILABLE` | 409 | Time slot already booked |
| `BOOKING_CONFLICT` | 409 | Booking state prevents action |
| `PAYMENT_REQUIRED` | 402 | Payment needed before action |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

# Module 1: Content Creation Engine

## Create Content Block

```http
POST /content/blocks
```

**Request:**
```json
{
  "product_id": "prod_abc123",
  "type": "TEXT",
  "content": {
    "body": "Professional-grade cordless drill...",
    "format": "markdown"
  },
  "display_order": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "blk_xyz789",
    "product_id": "prod_abc123",
    "type": "TEXT",
    "content": {
      "body": "Professional-grade cordless drill...",
      "format": "markdown"
    },
    "display_order": 1,
    "version": 1,
    "created_at": "2024-01-15T14:30:00.000Z"
  }
}
```

## AI Text Improvement

```http
POST /content/ai/improve
```

**Request:**
```json
{
  "text": "This drill is very good and will help you do stuff.",
  "improvements": ["clarity", "grammar", "tone"],
  "tone": "professional",
  "max_length": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "This drill is very good and will help you do stuff.",
    "improved": "This professional-grade drill delivers reliable performance for drilling and driving tasks in wood, metal, and masonry.",
    "changes": [
      {
        "type": "clarity",
        "original": "very good",
        "improved": "professional-grade",
        "reason": "More specific and descriptive"
      },
      {
        "type": "clarity",
        "original": "do stuff",
        "improved": "drilling and driving tasks in wood, metal, and masonry",
        "reason": "Specific use cases improve clarity"
      }
    ],
    "confidence": 0.92
  }
}
```

**Rules enforced:**
- AI suggestions only, never auto-applied
- Preserves original meaning
- No spam language or urgency tactics

---

# Module 2: Product & Catalog

## List Products

```http
GET /products?category=power-tools&location=tallinn&page=1&per_page=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_abc123",
      "name": "Bosch GSR 18V-55 Cordless Drill",
      "slug": "bosch-gsr-18v-55-cordless-drill",
      "category": {
        "id": "cat_001",
        "name": "Power Tools",
        "slug": "power-tools"
      },
      "brand": "Bosch",
      "model": "GSR 18V-55",
      "short_description": "Professional 18V cordless drill/driver...",
      "pricing": {
        "hourly": "4.50",
        "daily": "25.00",
        "weekly": "125.00",
        "deposit": "100.00",
        "currency": "EUR"
      },
      "availability": {
        "is_available_now": true,
        "next_available_slot": null,
        "available_locations": ["tallinn-kristiine", "tallinn-lasnamae"]
      },
      "images": [
        {
          "url": "https://cdn.rentbox.ee/products/bosch-gsr-18v-55-1.jpg",
          "alt": "Bosch GSR 18V-55 front view",
          "is_primary": true
        }
      ],
      "rating": {
        "average": 4.7,
        "count": 124
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

## Get Product Detail

```http
GET /products/{slug}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_abc123",
    "name": "Bosch GSR 18V-55 Cordless Drill",
    "slug": "bosch-gsr-18v-55-cordless-drill",
    "category": {
      "id": "cat_001",
      "name": "Power Tools",
      "slug": "power-tools",
      "breadcrumb": [
        { "name": "All Tools", "slug": "tools" },
        { "name": "Power Tools", "slug": "power-tools" }
      ]
    },
    "brand": "Bosch",
    "model": "GSR 18V-55",
    "description": "Professional 18V cordless drill/driver with brushless motor...",
    "specifications": {
      "power": "18V",
      "torque": "55Nm",
      "weight": "1.4kg",
      "chuck_size": "13mm",
      "battery_included": true,
      "charger_included": true
    },
    "pricing": {
      "hourly": "4.50",
      "daily": "25.00",
      "weekly": "125.00",
      "deposit": "100.00",
      "currency": "EUR"
    },
    "rental_terms": {
      "min_rental_hours": 1,
      "max_rental_days": 30,
      "requires_training": false
    },
    "availability_by_location": [
      {
        "location_id": "loc_001",
        "location_name": "Kristiine Keskus",
        "address": "Endla 45, Tallinn",
        "is_available_now": true,
        "next_available": null,
        "compartments_available": 2
      },
      {
        "location_id": "loc_002",
        "location_name": "Lasnamäe Centrum",
        "address": "Mustakivi tee 17, Tallinn",
        "is_available_now": false,
        "next_available": "2024-01-16T10:00:00+02:00",
        "compartments_available": 0
      }
    ],
    "images": [
      {
        "url": "https://cdn.rentbox.ee/products/bosch-gsr-18v-55-1.jpg",
        "alt": "Bosch GSR 18V-55 front view",
        "is_primary": true
      },
      {
        "url": "https://cdn.rentbox.ee/products/bosch-gsr-18v-55-2.jpg",
        "alt": "Bosch GSR 18V-55 with case",
        "is_primary": false
      }
    ],
    "content_blocks": [
      {
        "type": "TEXT",
        "content": { "body": "..." }
      },
      {
        "type": "FAQ",
        "content": {
          "items": [
            { "question": "What's included?", "answer": "..." }
          ]
        }
      }
    ],
    "seo": {
      "title": "Rent Bosch GSR 18V-55 Cordless Drill | Rentbox",
      "description": "Rent a professional Bosch cordless drill...",
      "schema_org": {
        "@type": "Product",
        "name": "Bosch GSR 18V-55 Cordless Drill",
        "offers": {
          "@type": "Offer",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "25.00",
            "priceCurrency": "EUR",
            "unitCode": "DAY"
          }
        }
      }
    }
  }
}
```

---

# Module 3: Booking Engine

## Check Availability

```http
GET /availability/{product_id}?location_id={location_id}&start_at={iso8601}&end_at={iso8601}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_available": true,
    "product_id": "prod_abc123",
    "location_id": "loc_001",
    "requested_slot": {
      "start_at": "2024-01-16T10:00:00+02:00",
      "end_at": "2024-01-16T18:00:00+02:00",
      "duration_hours": 8
    },
    "available_compartments": [
      {
        "compartment_id": "cmp_001",
        "locker_name": "Main Entrance Locker",
        "compartment_number": 3,
        "size": "MEDIUM"
      }
    ],
    "pricing": {
      "subtotal": "36.00",
      "tax_amount": "7.20",
      "deposit": "100.00",
      "total": "143.20",
      "breakdown": {
        "method": "hourly",
        "hours": 8,
        "rate_per_hour": "4.50"
      }
    }
  }
}
```

## Check Availability - Unavailable Response

```json
{
  "success": true,
  "data": {
    "is_available": false,
    "product_id": "prod_abc123",
    "location_id": "loc_001",
    "requested_slot": {
      "start_at": "2024-01-16T10:00:00+02:00",
      "end_at": "2024-01-16T18:00:00+02:00"
    },
    "conflict": {
      "type": "EXISTING_BOOKING",
      "blocking_until": "2024-01-16T14:00:00+02:00"
    },
    "alternatives": [
      {
        "start_at": "2024-01-16T14:00:00+02:00",
        "end_at": "2024-01-16T22:00:00+02:00",
        "is_same_duration": true
      },
      {
        "start_at": "2024-01-17T08:00:00+02:00",
        "end_at": "2024-01-17T16:00:00+02:00",
        "is_same_duration": true
      }
    ],
    "other_locations": [
      {
        "location_id": "loc_002",
        "location_name": "Lasnamäe Centrum",
        "is_available": true,
        "distance_km": 5.2
      }
    ]
  }
}
```

## Create Booking

```http
POST /bookings
```

**Request:**
```json
{
  "product_id": "prod_abc123",
  "compartment_id": "cmp_001",
  "start_at": "2024-01-16T10:00:00+02:00",
  "end_at": "2024-01-16T18:00:00+02:00",
  "idempotency_key": "idem_user123_20240115_abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bkg_xyz789",
    "booking_number": "RB-20240115-A1B2C3D4",
    "status": "PENDING",
    "expires_at": "2024-01-15T15:00:00+02:00",
    "product": {
      "id": "prod_abc123",
      "name": "Bosch GSR 18V-55 Cordless Drill"
    },
    "location": {
      "id": "loc_001",
      "name": "Kristiine Keskus",
      "address": "Endla 45, Tallinn"
    },
    "compartment": {
      "id": "cmp_001",
      "locker_name": "Main Entrance Locker",
      "number": 3
    },
    "schedule": {
      "start_at": "2024-01-16T10:00:00+02:00",
      "end_at": "2024-01-16T18:00:00+02:00",
      "duration_hours": 8,
      "timezone": "Europe/Tallinn"
    },
    "pricing": {
      "subtotal": "36.00",
      "tax_amount": "7.20",
      "deposit": "100.00",
      "total": "143.20",
      "currency": "EUR"
    },
    "next_steps": {
      "action": "COMPLETE_CHECKOUT",
      "url": "/checkout/bkg_xyz789",
      "expires_in_seconds": 900
    }
  }
}
```

## Booking Lifecycle Endpoints

### Get Booking
```http
GET /bookings/{booking_id}
```

### Cancel Booking
```http
POST /bookings/{booking_id}/cancel
```

**Request:**
```json
{
  "reason": "Changed plans"
}
```

### Extend Booking
```http
POST /bookings/{booking_id}/extend
```

**Request:**
```json
{
  "new_end_at": "2024-01-16T22:00:00+02:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "extension_id": "ext_123",
    "booking_id": "bkg_xyz789",
    "previous_end_at": "2024-01-16T18:00:00+02:00",
    "new_end_at": "2024-01-16T22:00:00+02:00",
    "additional_hours": 4,
    "additional_amount": "18.00",
    "status": "PENDING",
    "payment_required": true,
    "payment_url": "/checkout/extension/ext_123"
  }
}
```

**Response (Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "EXTENSION_BLOCKED",
    "message": "Cannot extend - another booking starts at 20:00.",
    "action": "Return by 18:00 or contact support for alternatives.",
    "details": {
      "max_extension_until": "2024-01-16T19:30:00+02:00",
      "blocking_booking_starts": "2024-01-16T20:00:00+02:00"
    }
  }
}
```

---

# Module 4: Calendar System

## Get Availability Calendar (Customer)

```http
GET /calendar/availability?product_id={id}&location_id={id}&month=2024-01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product_id": "prod_abc123",
    "location_id": "loc_001",
    "month": "2024-01",
    "timezone": "Europe/Tallinn",
    "days": [
      {
        "date": "2024-01-15",
        "is_operating": true,
        "operating_hours": { "open": "08:00", "close": "22:00" },
        "availability": "FULL",
        "available_slots": [
          { "start": "08:00", "end": "12:00" },
          { "start": "12:00", "end": "16:00" },
          { "start": "16:00", "end": "20:00" },
          { "start": "20:00", "end": "22:00" }
        ]
      },
      {
        "date": "2024-01-16",
        "is_operating": true,
        "operating_hours": { "open": "08:00", "close": "22:00" },
        "availability": "PARTIAL",
        "available_slots": [
          { "start": "08:00", "end": "10:00" },
          { "start": "14:00", "end": "22:00" }
        ],
        "booked_slots": [
          { "start": "10:00", "end": "14:00" }
        ]
      },
      {
        "date": "2024-01-17",
        "is_operating": true,
        "availability": "NONE",
        "reason": "Fully booked"
      }
    ]
  }
}
```

## Get Admin Timeline View

```http
GET /admin/calendar/timeline?locker_id={id}&date=2024-01-16
```

**Response:**
```json
{
  "success": true,
  "data": {
    "locker_id": "lkr_001",
    "locker_name": "Main Entrance Locker",
    "date": "2024-01-16",
    "timezone": "Europe/Tallinn",
    "compartments": [
      {
        "compartment_id": "cmp_001",
        "number": 1,
        "size": "MEDIUM",
        "status": "AVAILABLE",
        "events": [
          {
            "type": "BOOKING",
            "booking_id": "bkg_001",
            "booking_number": "RB-20240116-XYZ",
            "customer_name": "Jaan Tamm",
            "product_name": "Bosch Drill",
            "status": "PAID",
            "start_at": "2024-01-16T10:00:00+02:00",
            "end_at": "2024-01-16T14:00:00+02:00",
            "color": "#22C55E"
          },
          {
            "type": "BOOKING",
            "booking_id": "bkg_002",
            "booking_number": "RB-20240116-ABC",
            "customer_name": "Mari Mets",
            "product_name": "Bosch Drill",
            "status": "PENDING",
            "start_at": "2024-01-16T16:00:00+02:00",
            "end_at": "2024-01-16T20:00:00+02:00",
            "color": "#F59E0B"
          }
        ]
      },
      {
        "compartment_id": "cmp_002",
        "number": 2,
        "size": "LARGE",
        "status": "MAINTENANCE",
        "events": [
          {
            "type": "MAINTENANCE",
            "maintenance_id": "mnt_001",
            "reason": "Servo replacement",
            "start_at": "2024-01-16T08:00:00+02:00",
            "end_at": "2024-01-16T18:00:00+02:00",
            "color": "#6B7280"
          }
        ]
      }
    ]
  }
}
```

## Create Maintenance Block

```http
POST /admin/calendar/maintenance
```

**Request:**
```json
{
  "compartment_id": "cmp_002",
  "start_at": "2024-01-17T08:00:00+02:00",
  "end_at": "2024-01-17T18:00:00+02:00",
  "reason": "Scheduled maintenance"
}
```

---

# Module 5: User Dashboard ("Minu Rendid")

## Get My Rentals

```http
GET /me/rentals?status=active,upcoming,past&page=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "active": [
      {
        "id": "bkg_xyz789",
        "booking_number": "RB-20240115-A1B2C3D4",
        "product": {
          "name": "Bosch GSR 18V-55",
          "image": "https://cdn.rentbox.ee/...",
          "slug": "bosch-gsr-18v-55"
        },
        "location": {
          "name": "Kristiine Keskus",
          "address": "Endla 45, Tallinn"
        },
        "schedule": {
          "start_at": "2024-01-15T10:00:00+02:00",
          "end_at": "2024-01-15T18:00:00+02:00",
          "timezone": "Europe/Tallinn"
        },
        "status": "ACTIVE",
        "time_remaining": {
          "hours": 3,
          "minutes": 45,
          "seconds": 12,
          "total_seconds": 13512,
          "is_urgent": false
        },
        "access": {
          "can_open_locker": true,
          "access_pin": "1234",
          "attempts_remaining": 3
        },
        "actions": {
          "can_extend": true,
          "can_return": true,
          "can_cancel": false
        }
      }
    ],
    "upcoming": [
      {
        "id": "bkg_abc456",
        "booking_number": "RB-20240116-E5F6G7H8",
        "product": {
          "name": "Makita Circular Saw",
          "image": "https://cdn.rentbox.ee/...",
          "slug": "makita-circular-saw"
        },
        "schedule": {
          "start_at": "2024-01-17T08:00:00+02:00",
          "end_at": "2024-01-17T20:00:00+02:00"
        },
        "status": "PAID",
        "starts_in": {
          "days": 1,
          "hours": 18,
          "total_hours": 42
        },
        "actions": {
          "can_cancel": true,
          "cancellation_deadline": "2024-01-16T20:00:00+02:00"
        }
      }
    ],
    "past": [
      {
        "id": "bkg_old123",
        "booking_number": "RB-20240110-PAST123",
        "product": {
          "name": "DeWalt Impact Driver",
          "slug": "dewalt-impact-driver"
        },
        "schedule": {
          "start_at": "2024-01-10T10:00:00+02:00",
          "end_at": "2024-01-10T18:00:00+02:00",
          "actual_return_at": "2024-01-10T17:45:00+02:00"
        },
        "status": "COMPLETED",
        "total_paid": "43.20",
        "actions": {
          "can_rent_again": true,
          "can_download_invoice": true
        }
      }
    ]
  }
}
```

## Get Invoice

```http
GET /me/invoices/{booking_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice_number": "INV-2024-00123",
    "booking_number": "RB-20240110-PAST123",
    "issued_at": "2024-01-10T18:00:00+02:00",
    "customer": {
      "name": "Jaan Tamm",
      "email": "jaan@example.com",
      "address": "Pärnu mnt 123, Tallinn"
    },
    "items": [
      {
        "description": "DeWalt Impact Driver rental (8 hours)",
        "quantity": 1,
        "unit_price": "36.00",
        "total": "36.00"
      }
    ],
    "subtotal": "36.00",
    "tax_rate": "20%",
    "tax_amount": "7.20",
    "total": "43.20",
    "deposit_status": "RELEASED",
    "payment_method": "Visa ****1234",
    "download_url": "https://api.rentbox.ee/invoices/INV-2024-00123.pdf"
  }
}
```

---

# Module 6: Checkout & Digital Signing

## Initiate Checkout

```http
POST /checkout/initiate
```

**Request:**
```json
{
  "booking_id": "bkg_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_id": "chk_123",
    "booking_id": "bkg_xyz789",
    "steps": [
      {
        "step": 1,
        "name": "REVIEW",
        "status": "CURRENT",
        "data": {
          "booking_summary": { ... }
        }
      },
      {
        "step": 2,
        "name": "TERMS",
        "status": "PENDING",
        "requires_signature": true,
        "signature_method": "TYPED"
      },
      {
        "step": 3,
        "name": "PAYMENT",
        "status": "PENDING"
      },
      {
        "step": 4,
        "name": "CONFIRMATION",
        "status": "PENDING"
      }
    ],
    "expires_at": "2024-01-15T15:00:00+02:00"
  }
}
```

## Get Contract Terms

```http
GET /checkout/{checkout_id}/contract
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": "ctr_456",
    "template_name": "Standard Rental Agreement v2.1",
    "content_html": "<h1>Rental Agreement</h1><p>By signing this agreement...</p>",
    "content_plain": "RENTAL AGREEMENT\n\nBy signing this agreement...",
    "key_terms": [
      "Rental period: 2024-01-16 10:00 - 18:00",
      "Return location: Kristiine Keskus, Locker #3",
      "Late fee: €6.75/hour after 30-minute grace period",
      "Damage liability: Up to €500 replacement value"
    ],
    "signature_requirement": {
      "method": "TYPED",
      "reason": "standard_rental",
      "alternative_methods": []
    }
  }
}
```

## Sign Contract (Typed)

```http
POST /checkout/{checkout_id}/sign
```

**Request:**
```json
{
  "method": "TYPED",
  "signature": "Jaan Tamm",
  "terms_accepted": true,
  "consent_marketing": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contract_id": "ctr_456",
    "status": "SIGNED",
    "signed_at": "2024-01-15T14:35:00+02:00",
    "content_hash": "sha256:a1b2c3d4e5f6...",
    "next_step": "PAYMENT"
  }
}
```

## Sign Contract (Smart-ID)

```http
POST /checkout/{checkout_id}/sign/smart-id/initiate
```

**Request:**
```json
{
  "personal_code": "38001010001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "sid_789",
    "verification_code": "1234",
    "status": "WAITING",
    "message": "Check your Smart-ID app and confirm with code 1234",
    "timeout_seconds": 120
  }
}
```

## Poll Smart-ID Status

```http
GET /checkout/{checkout_id}/sign/smart-id/status?session_id=sid_789
```

## Create Payment

```http
POST /checkout/{checkout_id}/payment
```

**Request:**
```json
{
  "payment_method_id": "pm_saved_123",
  "save_card": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "pay_abc",
    "status": "REQUIRES_ACTION",
    "client_secret": "pi_xxx_secret_yyy",
    "next_action": {
      "type": "REDIRECT_TO_URL",
      "url": "https://checkout.stripe.com/..."
    }
  }
}
```

## Confirm Payment Completion

```http
POST /checkout/{checkout_id}/payment/confirm
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking_id": "bkg_xyz789",
    "booking_number": "RB-20240115-A1B2C3D4",
    "status": "PAID",
    "payment_status": "COMPLETED",
    "confirmation": {
      "message": "Your rental is confirmed!",
      "access_instructions": "Your locker will be ready at 10:00 on January 16th.",
      "access_pin": "1234",
      "location_map_url": "https://...",
      "add_to_calendar_url": "https://..."
    }
  }
}
```

---

# Module 7: Locker Access Service

## Request Locker Open

```http
POST /locker/open
```

**Request:**
```json
{
  "booking_id": "bkg_xyz789"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "event_id": "evt_abc123",
    "compartment_id": "cmp_001",
    "locker_name": "Main Entrance Locker",
    "compartment_number": 3,
    "status": "OPENED",
    "message": "Compartment #3 is now open. Please take your tool.",
    "auto_close_seconds": 60
  }
}
```

**Response (Access Denied):**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Your rental hasn't started yet.",
    "details": {
      "booking_status": "PAID",
      "starts_at": "2024-01-16T10:00:00+02:00",
      "current_time": "2024-01-15T14:30:00+02:00"
    },
    "action": "Your rental starts tomorrow at 10:00."
  }
}
```

**Response (Hardware Failure):**
```json
{
  "success": false,
  "error": {
    "code": "LOCKER_TIMEOUT",
    "message": "The locker didn't respond. Please try again.",
    "details": {
      "attempt": 2,
      "max_attempts": 3
    },
    "action": "Tap 'Try Again' or use PIN code 1234 on the keypad.",
    "fallback": {
      "type": "PIN",
      "pin": "1234",
      "instructions": "Enter this PIN on the locker keypad."
    }
  }
}
```

## Get Access PIN (Fallback)

```http
GET /locker/access-pin/{booking_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pin": "1234",
    "valid_until": "2024-01-16T18:30:00+02:00",
    "instructions": "Enter this PIN on the locker keypad to open compartment #3.",
    "location": {
      "locker_name": "Main Entrance Locker",
      "compartment": 3,
      "floor": "Ground floor, near entrance"
    }
  }
}
```

## Request SMS PIN

```http
POST /locker/request-sms-pin
```

**Request:**
```json
{
  "booking_id": "bkg_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "PIN sent to +372 5XX XXX12",
    "valid_for_minutes": 15
  }
}
```

---

# Module 8: Return Flow

## Initiate Return

```http
POST /return/initiate
```

**Request:**
```json
{
  "booking_id": "bkg_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "return_id": "ret_123",
    "booking_id": "bkg_xyz789",
    "compartment": {
      "locker_name": "Main Entrance Locker",
      "number": 3,
      "status": "READY_FOR_RETURN"
    },
    "instructions": [
      "Open the compartment using the app or PIN",
      "Place the tool inside",
      "Close the door firmly",
      "Optionally, take a photo of the returned item"
    ],
    "return_deadline": "2024-01-16T18:00:00+02:00",
    "is_within_time": true
  }
}
```

## Confirm Return

```http
POST /return/{return_id}/confirm
```

**Request:**
```json
{
  "condition": "GOOD",
  "notes": "All parts included, battery charged"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "return_id": "ret_123",
    "status": "PENDING_VERIFICATION",
    "returned_at": "2024-01-16T17:45:00+02:00",
    "is_on_time": true,
    "deposit_status": "PENDING_RELEASE",
    "message": "Thank you for returning! Your deposit will be released within 24 hours after verification."
  }
}
```

## Upload Return Photo

```http
POST /return/{return_id}/photos
Content-Type: multipart/form-data
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photo_id": "pht_456",
    "url": "https://cdn.rentbox.ee/returns/ret_123/photo_1.jpg",
    "uploaded_at": "2024-01-16T17:46:00+02:00"
  }
}
```

## Admin: Verify Return

```http
POST /admin/returns/{return_id}/verify
```

**Request:**
```json
{
  "status": "VERIFIED_OK",
  "notes": "Tool in good condition, all accessories present",
  "release_deposit": true
}
```

---

# Module 9: Notification Engine

## Get Notification Preferences

```http
GET /me/notification-preferences
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "jaan@example.com",
    "phone": "+372 5XX XXX12",
    "preferences": {
      "booking_confirmed": { "email": true, "sms": false, "push": true },
      "rental_starting": { "email": true, "sms": true, "push": true },
      "return_reminder": { "email": true, "sms": true, "push": true },
      "overdue_warning": { "email": true, "sms": true, "push": true },
      "marketing": { "email": false, "sms": false, "push": false }
    },
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Europe/Tallinn"
    }
  }
}
```

## Update Notification Preferences

```http
PATCH /me/notification-preferences
```

**Request:**
```json
{
  "preferences": {
    "rental_starting": { "sms": false }
  },
  "quiet_hours": {
    "enabled": true,
    "start": "23:00",
    "end": "07:00"
  }
}
```

## Admin: Send Manual Notification

```http
POST /admin/notifications/send
```

**Request:**
```json
{
  "user_id": "usr_123",
  "channel": "EMAIL",
  "type": "CUSTOM",
  "subject": "Update on your rental",
  "content": "Dear Jaan, we wanted to inform you..."
}
```

---

# Module 10: Incident Management

## Create Incident

```http
POST /incidents
```

**Request:**
```json
{
  "type": "LOCKER_MALFUNCTION",
  "severity": "P2",
  "title": "Compartment #3 not opening",
  "description": "Customer reports compartment won't open after 3 attempts",
  "booking_id": "bkg_xyz789",
  "locker_id": "lkr_001",
  "compartment_id": "cmp_003"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inc_abc123",
    "incident_number": "INC-20240115-ABC123",
    "type": "LOCKER_MALFUNCTION",
    "severity": "P2",
    "status": "OPEN",
    "title": "Compartment #3 not opening",
    "created_at": "2024-01-15T14:30:00+02:00",
    "response_sla": "2024-01-15T15:30:00+02:00"
  }
}
```

## List Incidents

```http
GET /admin/incidents?status=OPEN,INVESTIGATING&severity=P1,P2&page=1
```

## Update Incident

```http
PATCH /admin/incidents/{incident_id}
```

**Request:**
```json
{
  "status": "INVESTIGATING",
  "assigned_to": "usr_tech_001"
}
```

## Add Incident Comment

```http
POST /admin/incidents/{incident_id}/comments
```

**Request:**
```json
{
  "content": "Checked locker remotely. Servo motor not responding. Dispatching technician.",
  "is_internal": true
}
```

## Resolve Incident

```http
POST /admin/incidents/{incident_id}/resolve
```

**Request:**
```json
{
  "resolution_notes": "Replaced servo motor. Tested successfully.",
  "root_cause": "Servo motor failure due to age",
  "preventive_action": "Added to maintenance schedule for quarterly servo inspection"
}
```

---

# Module 11: RBAC

## Get Current User Permissions

```http
GET /me/permissions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": "OPERATOR",
    "permissions": [
      "bookings:read",
      "bookings:update",
      "bookings:cancel",
      "customers:read",
      "lockers:read",
      "lockers:status",
      "incidents:read",
      "incidents:create",
      "incidents:update"
    ],
    "denied": [
      "users:delete",
      "billing:manage",
      "system:configure"
    ]
  }
}
```

## Admin: List Roles

```http
GET /admin/roles
```

## Admin: Update User Role

```http
PATCH /admin/users/{user_id}/role
```

**Request:**
```json
{
  "role": "OPERATOR",
  "reason": "Promoted to operations team"
}
```

---

# Module 12: SEO Service

## Get SEO Metadata

```http
GET /seo/product/{slug}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Rent Bosch GSR 18V-55 Cordless Drill in Tallinn | Rentbox",
    "description": "Professional cordless drill for rent. €4.50/hour or €25/day. Pick up from 3 locations in Tallinn. No commitment, flexible rental periods.",
    "canonical_url": "https://rentbox.ee/rent/bosch-gsr-18v-55-cordless-drill",
    "og": {
      "type": "product",
      "image": "https://cdn.rentbox.ee/products/bosch-drill-og.jpg",
      "price_amount": "25.00",
      "price_currency": "EUR"
    },
    "schema_org": {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Bosch GSR 18V-55 Cordless Drill",
      "description": "Professional 18V cordless drill...",
      "brand": {
        "@type": "Brand",
        "name": "Bosch"
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "25.00",
          "priceCurrency": "EUR",
          "unitCode": "DAY",
          "referenceQuantity": {
            "@type": "QuantitativeValue",
            "value": "1",
            "unitCode": "DAY"
          }
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.7",
        "reviewCount": "124"
      }
    }
  }
}
```

## Generate Rent vs Buy Calculator Data

```http
POST /seo/rent-vs-buy/calculate
```

**Request:**
```json
{
  "product_id": "prod_abc123",
  "purchase_price": 450.00,
  "expected_lifespan_years": 5,
  "usage_frequency": "MONTHLY",
  "usage_duration_hours": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation": "RENT",
    "analysis": {
      "yearly_rental_cost": 300.00,
      "yearly_ownership_cost": 90.00,
      "break_even_rentals_per_year": 18,
      "your_estimated_rentals": 12,
      "yearly_savings_by_renting": 210.00
    },
    "breakdown": {
      "rental": {
        "per_use_cost": 25.00,
        "annual_total": 300.00,
        "includes": ["Tool", "Accessories", "Maintenance", "Storage"]
      },
      "purchase": {
        "initial_cost": 450.00,
        "annual_depreciation": 90.00,
        "estimated_maintenance": 20.00,
        "storage_cost": 0,
        "annual_total": 110.00
      }
    },
    "conclusion": "At 12 uses per year, renting saves you €210 annually compared to buying."
  }
}
```

---

# Webhooks

## Webhook Events

Rentbox sends webhooks for key events. Configure webhook URLs in the admin panel.

### Booking Events
- `booking.created`
- `booking.paid`
- `booking.started`
- `booking.completed`
- `booking.cancelled`
- `booking.overdue`

### Payment Events
- `payment.completed`
- `payment.failed`
- `payment.refunded`

### Locker Events
- `locker.opened`
- `locker.closed`
- `locker.error`

### Webhook Payload

```json
{
  "id": "evt_webhook_123",
  "type": "booking.paid",
  "created_at": "2024-01-15T14:35:00.000Z",
  "data": {
    "booking_id": "bkg_xyz789",
    "booking_number": "RB-20240115-A1B2C3D4",
    "user_id": "usr_123",
    "product_id": "prod_abc",
    "amount": "143.20",
    "currency": "EUR"
  }
}
```

### Webhook Security

All webhooks include signature header:

```http
X-Rentbox-Signature: sha256=abc123...
```

Verify by computing HMAC-SHA256 of payload with your webhook secret.

---

# Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public (catalog) | 100 | 1 minute |
| Authenticated | 300 | 1 minute |
| Booking creation | 10 | 1 minute |
| Payment | 5 | 1 minute |
| Admin | 500 | 1 minute |

Rate limit headers:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1705325460
```
