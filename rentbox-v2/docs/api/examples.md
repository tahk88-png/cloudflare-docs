# Rentbox v2 - API Examples & JSON Payloads

> Complete examples for all major API operations.

## Table of Contents

1. [Product Catalog](#product-catalog)
2. [Availability Check](#availability-check)
3. [Booking Flow](#booking-flow)
4. [Payment](#payment)
5. [Locker Access](#locker-access)
6. [Returns](#returns)
7. [Extensions](#extensions)
8. [Admin Operations](#admin-operations)
9. [Webhooks](#webhooks)

---

## Product Catalog

### List Products

**Request:**
```http
GET /api/v1/products?category=power-tools&location_id=loc_abc123&page=1&per_page=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_001",
      "sku": "DRILL-BOSCH-18V",
      "name": "Bosch Professional Drill GSB 18V-55",
      "slug": "bosch-professional-drill-gsb-18v-55",
      "short_description": "18V akutrell 2x 4.0Ah akuga, kiirlaadijaga",
      "category": {
        "id": "cat_drills",
        "name": "Trellid",
        "slug": "drills"
      },
      "images": [
        {
          "url": "https://cdn.rentbox.ee/products/drill-bosch-18v-1.jpg",
          "alt": "Bosch GSB 18V-55 eestvaade",
          "is_primary": true
        },
        {
          "url": "https://cdn.rentbox.ee/products/drill-bosch-18v-2.jpg",
          "alt": "Bosch GSB 18V-55 komplekt"
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
        "available_locations_count": 3
      },
      "rating": {
        "average": 4.8,
        "count": 127
      }
    },
    {
      "id": "prod_002",
      "sku": "SAW-MAKITA-CIRCULAR",
      "name": "Makita Ketassaag DHS680",
      "slug": "makita-ketassaag-dhs680",
      "short_description": "18V akutoitel ketassaag, 165mm tera",
      "category": {
        "id": "cat_saws",
        "name": "Saed",
        "slug": "saws"
      },
      "images": [
        {
          "url": "https://cdn.rentbox.ee/products/saw-makita-1.jpg",
          "alt": "Makita DHS680"
        }
      ],
      "pricing": {
        "hourly_rate": "5.00",
        "daily_rate": "20.00",
        "weekly_rate": "100.00",
        "deposit_amount": "75.00",
        "currency": "EUR"
      },
      "availability": {
        "available_now": false,
        "next_available": "2024-01-16T14:00:00+02:00",
        "available_locations_count": 2
      },
      "rating": {
        "average": 4.6,
        "count": 89
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "req_abc123def456",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Product Detail

**Request:**
```http
GET /api/v1/products/bosch-professional-drill-gsb-18v-55
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_001",
    "sku": "DRILL-BOSCH-18V",
    "name": "Bosch Professional Drill GSB 18V-55",
    "slug": "bosch-professional-drill-gsb-18v-55",
    "description": "Professionaalne 18V akutrell kodukasutajale ja kutselisele. Kompaktne ja võimas tööriist puurimiseks ja kruvimiseks erinevates materjalides.\n\n**Omadused:**\n- Võimas 55 Nm pöördemoment\n- Kiirusregulaator\n- LED-valgustus töötsoonis\n- Ergonoomilise disainiga\n\n**Komplektis:**\n- Trell\n- 2x 4.0Ah akut\n- Kiirlaadija\n- Kandekohver",
    "short_description": "18V akutrell 2x 4.0Ah akuga, kiirlaadijaga",
    "category": {
      "id": "cat_drills",
      "name": "Trellid",
      "slug": "drills",
      "breadcrumb": [
        { "name": "Elektritööriistad", "slug": "power-tools" },
        { "name": "Trellid", "slug": "drills" }
      ]
    },
    "specifications": {
      "Pinge": "18V",
      "Pöördemoment": "55 Nm",
      "Pöörete arv": "0-1900 p/min",
      "Padrunimõõt": "13 mm",
      "Kaal akuga": "1.9 kg",
      "Aku mahtuvus": "4.0 Ah",
      "Laadimisaeg": "36 min"
    },
    "images": [
      {
        "url": "https://cdn.rentbox.ee/products/drill-bosch-18v-1.jpg",
        "url_thumb": "https://cdn.rentbox.ee/products/drill-bosch-18v-1-thumb.jpg",
        "alt": "Bosch GSB 18V-55 eestvaade",
        "is_primary": true
      },
      {
        "url": "https://cdn.rentbox.ee/products/drill-bosch-18v-2.jpg",
        "url_thumb": "https://cdn.rentbox.ee/products/drill-bosch-18v-2-thumb.jpg",
        "alt": "Bosch GSB 18V-55 komplekt"
      },
      {
        "url": "https://cdn.rentbox.ee/products/drill-bosch-18v-3.jpg",
        "url_thumb": "https://cdn.rentbox.ee/products/drill-bosch-18v-3-thumb.jpg",
        "alt": "Bosch GSB 18V-55 kasutuses"
      }
    ],
    "videos": [
      {
        "type": "youtube",
        "url": "https://www.youtube.com/watch?v=example123",
        "title": "Bosch GSB 18V-55 ülevaade"
      }
    ],
    "documents": [
      {
        "type": "manual",
        "name": "Kasutusjuhend (EST)",
        "url": "https://cdn.rentbox.ee/docs/bosch-gsb-18v-manual-est.pdf",
        "size_kb": 2450
      },
      {
        "type": "safety",
        "name": "Ohutusjuhend",
        "url": "https://cdn.rentbox.ee/docs/bosch-gsb-18v-safety.pdf",
        "size_kb": 890
      }
    ],
    "pricing": {
      "hourly_rate": "3.50",
      "daily_rate": "15.00",
      "weekly_rate": "75.00",
      "deposit_amount": "50.00",
      "currency": "EUR",
      "pricing_tiers": [
        { "duration": "1-8 tundi", "rate": "3.50/h" },
        { "duration": "1-6 päeva", "rate": "15.00/päev" },
        { "duration": "7+ päeva", "rate": "75.00/nädal" }
      ]
    },
    "rental_rules": {
      "min_rental_hours": 2,
      "max_rental_days": 14,
      "buffer_minutes": 30,
      "requires_deposit": true,
      "requires_id_verification": false,
      "min_age": 18,
      "requires_training": false
    },
    "locations": [
      {
        "id": "loc_abc123",
        "name": "Tallinn Keskus",
        "slug": "tallinn-keskus",
        "address": "Viru väljak 4, Tallinn",
        "available_now": true,
        "next_available": null,
        "inventory_count": 3
      },
      {
        "id": "loc_def456",
        "name": "Tartu Lõunakeskus",
        "slug": "tartu-lounakeskus",
        "address": "Ringtee 75, Tartu",
        "available_now": true,
        "next_available": null,
        "inventory_count": 2
      }
    ],
    "related_products": [
      {
        "id": "prod_003",
        "name": "Bosch puuride komplekt",
        "slug": "bosch-puuride-komplekt",
        "image": "https://cdn.rentbox.ee/products/bosch-bits-thumb.jpg",
        "daily_rate": "5.00"
      },
      {
        "id": "prod_004",
        "name": "Makita löökpuurmasin",
        "slug": "makita-lookpuurmasin",
        "image": "https://cdn.rentbox.ee/products/makita-hammer-thumb.jpg",
        "daily_rate": "18.00"
      }
    ],
    "reviews": {
      "average": 4.8,
      "count": 127,
      "distribution": {
        "5": 98,
        "4": 22,
        "3": 5,
        "2": 1,
        "1": 1
      }
    },
    "seo": {
      "meta_title": "Rendi Bosch GSB 18V-55 akutrell | Rentbox",
      "meta_description": "Rendi professionaalne Bosch 18V akutrell. 55 Nm pöördemoment, 2 akut komplektis. Alates €15/päev.",
      "canonical_url": "https://rentbox.ee/catalog/drills/bosch-professional-drill-gsb-18v-55"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2024-01-15T10:31:00.000Z"
  }
}
```

---

## Availability Check

**Request:**
```http
GET /api/v1/products/bosch-professional-drill-gsb-18v-55/availability?location_id=loc_abc123&start_at=2024-01-20T09:00:00%2B02:00&end_at=2024-01-20T17:00:00%2B02:00
Authorization: Bearer <token>
```

**Response (Available):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "product_id": "prod_001",
    "location_id": "loc_abc123",
    "requested_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00",
      "duration_hours": 8
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3",
      "locker": {
        "id": "lock_abc123",
        "code": "L001"
      }
    },
    "pricing_estimate": {
      "calculation_type": "daily",
      "breakdown": [
        {
          "description": "1 päev × €15.00",
          "amount": "15.00"
        },
        {
          "description": "Tagatisraha (tagastatav)",
          "amount": "50.00"
        },
        {
          "description": "Käibemaks 22%",
          "amount": "3.30"
        }
      ],
      "subtotal": "15.00",
      "deposit": "50.00",
      "tax": "3.30",
      "total": "68.30",
      "currency": "EUR"
    },
    "valid_until": "2024-01-15T10:45:00+02:00"
  },
  "meta": {
    "request_id": "req_avail123",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

**Response (Unavailable):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "product_id": "prod_001",
    "location_id": "loc_abc123",
    "requested_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00"
    },
    "conflict": {
      "type": "booking_exists",
      "blocked_from": "2024-01-20T08:00:00+02:00",
      "blocked_until": "2024-01-20T14:30:00+02:00"
    },
    "alternatives": [
      {
        "start_at": "2024-01-20T15:00:00+02:00",
        "end_at": "2024-01-20T23:00:00+02:00",
        "available": true
      },
      {
        "start_at": "2024-01-21T09:00:00+02:00",
        "end_at": "2024-01-21T17:00:00+02:00",
        "available": true
      },
      {
        "location": {
          "id": "loc_def456",
          "name": "Tartu Lõunakeskus"
        },
        "start_at": "2024-01-20T09:00:00+02:00",
        "end_at": "2024-01-20T17:00:00+02:00",
        "available": true
      }
    ],
    "message": "Soovitud ajavahemik ei ole saadaval"
  },
  "meta": {
    "request_id": "req_avail124",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## Booking Flow

### Create Booking

**Request:**
```http
POST /api/v1/bookings
Authorization: Bearer <token>
Content-Type: application/json
X-Idempotency-Key: booking_create_usr123_1705312800
```

```json
{
  "product_id": "prod_001",
  "location_id": "loc_abc123",
  "start_at": "2024-01-20T09:00:00+02:00",
  "end_at": "2024-01-20T17:00:00+02:00",
  "notes": "Esimene kord selle trelliga"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "book_abc123",
    "booking_number": "RB-2024-000456",
    "status": "pending",
    "product": {
      "id": "prod_001",
      "name": "Bosch Professional Drill GSB 18V-55",
      "sku": "DRILL-BOSCH-18V",
      "image": "https://cdn.rentbox.ee/products/drill-bosch-18v-1-thumb.jpg"
    },
    "location": {
      "id": "loc_abc123",
      "name": "Tallinn Keskus",
      "address": "Viru väljak 4, Tallinn"
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3",
      "locker": {
        "id": "lock_abc123",
        "code": "L001"
      }
    },
    "time_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00",
      "duration_hours": 8
    },
    "pricing": {
      "hourly_rate": "3.50",
      "daily_rate": "15.00",
      "subtotal": "15.00",
      "deposit_amount": "50.00",
      "tax_amount": "3.30",
      "total_amount": "68.30",
      "currency": "EUR",
      "breakdown": [
        { "description": "1 päev × €15.00", "amount": "15.00" },
        { "description": "Tagatisraha (tagastatav)", "amount": "50.00" },
        { "description": "Käibemaks 22%", "amount": "3.30" }
      ]
    },
    "expires_at": "2024-01-15T10:50:00+02:00",
    "requires_signature": true,
    "signature_type_required": "typed",
    "checkout_url": "https://rentbox.ee/checkout/book_abc123",
    "notes": "Esimene kord selle trelliga",
    "created_at": "2024-01-15T10:35:00+02:00"
  },
  "meta": {
    "request_id": "req_book001",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

### Booking Conflict Error

**Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "See ajavahemik ei ole enam saadaval",
    "details": {
      "requested_start": "2024-01-20T09:00:00+02:00",
      "requested_end": "2024-01-20T17:00:00+02:00",
      "blocked_until": "2024-01-20T14:30:00+02:00"
    },
    "suggested_action": "Varaseim saadaval aeg on 15:00. Kas soovite broneerida 15:00-23:00?",
    "alternatives": [
      {
        "start_at": "2024-01-20T15:00:00+02:00",
        "end_at": "2024-01-20T23:00:00+02:00"
      }
    ]
  },
  "meta": {
    "request_id": "req_book002",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

### Get Booking Details

**Request:**
```http
GET /api/v1/bookings/book_abc123
Authorization: Bearer <token>
```

**Response (Confirmed Booking):**
```json
{
  "success": true,
  "data": {
    "id": "book_abc123",
    "booking_number": "RB-2024-000456",
    "status": "confirmed",
    "product": {
      "id": "prod_001",
      "name": "Bosch Professional Drill GSB 18V-55",
      "sku": "DRILL-BOSCH-18V",
      "image": "https://cdn.rentbox.ee/products/drill-bosch-18v-1.jpg",
      "documents": [
        {
          "type": "manual",
          "name": "Kasutusjuhend",
          "url": "https://cdn.rentbox.ee/docs/bosch-gsb-18v-manual-est.pdf"
        }
      ]
    },
    "location": {
      "id": "loc_abc123",
      "name": "Tallinn Keskus",
      "address": "Viru väljak 4, Tallinn",
      "coordinates": {
        "lat": 59.437,
        "lng": 24.7536
      },
      "directions_url": "https://maps.google.com/?q=59.437,24.7536"
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3",
      "locker": {
        "id": "lock_abc123",
        "code": "L001",
        "location_description": "Kaubanduskeskuse 1. korrus, sissepääsu juures"
      }
    },
    "time_window": {
      "start_at": "2024-01-20T09:00:00+02:00",
      "end_at": "2024-01-20T17:00:00+02:00",
      "duration_hours": 8,
      "picked_up_at": null,
      "returned_at": null,
      "access_from": "2024-01-20T08:30:00+02:00",
      "access_until": "2024-01-20T18:00:00+02:00"
    },
    "pricing": {
      "subtotal": "15.00",
      "deposit_amount": "50.00",
      "tax_amount": "3.30",
      "total_amount": "68.30",
      "currency": "EUR",
      "extension_charges": "0.00",
      "overdue_charges": "0.00"
    },
    "payment": {
      "status": "captured",
      "method": "card",
      "card_brand": "visa",
      "card_last_four": "4242",
      "paid_at": "2024-01-15T10:40:00+02:00"
    },
    "deposit": {
      "status": "held",
      "amount": "50.00",
      "held_until": "2024-01-27T17:00:00+02:00"
    },
    "contract": {
      "id": "contr_abc123",
      "signed_at": "2024-01-15T10:39:00+02:00",
      "signature_type": "typed",
      "signer_name": "Jaan Tamm",
      "pdf_url": "https://cdn.rentbox.ee/contracts/book_abc123.pdf"
    },
    "access": {
      "pin": "847293",
      "valid_from": "2024-01-20T08:30:00+02:00",
      "valid_until": "2024-01-20T18:00:00+02:00",
      "uses_remaining": 2,
      "instructions": [
        "Minge kapile L001 (kaubanduskeskuse 1. korrus)",
        "Leidke kapi ukseava A3",
        "Sisestage PIN: 847293",
        "Uks avaneb automaatselt"
      ]
    },
    "timeline": [
      {
        "event": "created",
        "status": "pending",
        "timestamp": "2024-01-15T10:35:00+02:00",
        "description": "Broneering loodud"
      },
      {
        "event": "contract_signed",
        "timestamp": "2024-01-15T10:39:00+02:00",
        "description": "Leping allkirjastatud"
      },
      {
        "event": "payment_captured",
        "timestamp": "2024-01-15T10:40:00+02:00",
        "description": "Makse tehtud: €68.30"
      },
      {
        "event": "confirmed",
        "status": "confirmed",
        "timestamp": "2024-01-15T10:40:00+02:00",
        "description": "Broneering kinnitatud"
      }
    ],
    "actions": {
      "can_cancel": true,
      "can_extend": true,
      "can_open_locker": false,
      "cancellation_policy": {
        "refund_percent": 100,
        "message": "Täielik tagasimakse (tühistamine > 24h enne)"
      }
    },
    "created_at": "2024-01-15T10:35:00+02:00",
    "updated_at": "2024-01-15T10:40:00+02:00"
  },
  "meta": {
    "request_id": "req_book003",
    "timestamp": "2024-01-15T10:45:00.000Z"
  }
}
```

---

## Payment

### Create Checkout Session

**Request:**
```http
POST /api/v1/payments/checkout
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "booking_id": "book_abc123",
  "return_url": "https://rentbox.ee/booking/book_abc123/confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_session_id": "cs_live_a1b2c3d4e5",
    "client_secret": "pi_abc123_secret_xyz789",
    "payment_url": "https://checkout.stripe.com/pay/cs_live_a1b2c3d4e5",
    "amount": "68.30",
    "currency": "EUR",
    "expires_at": "2024-01-15T11:35:00+02:00"
  },
  "meta": {
    "request_id": "req_pay001",
    "timestamp": "2024-01-15T10:36:00.000Z"
  }
}
```

---

## Locker Access

### Open Door

**Request:**
```http
POST /api/v1/lockers/comp_xyz789/open
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "booking_id": "book_abc123",
  "access_type": "pickup"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "compartment_id": "comp_xyz789",
    "door_status": "opening",
    "message": "Uks avaneb. Palun võtke toode 60 sekundi jooksul.",
    "timeout_seconds": 60,
    "instructions": [
      "Oodake kuni LED muutub roheliseks",
      "Avage uks ja võtke toode",
      "Sulgege uks kindlalt"
    ]
  },
  "meta": {
    "request_id": "req_door001",
    "timestamp": "2024-01-20T09:15:00.000Z"
  }
}
```

**Response (Too Early):**
```json
{
  "success": false,
  "error": {
    "code": "TOO_EARLY",
    "message": "Kappi saate avada alates 08:30",
    "details": {
      "booking_starts_at": "2024-01-20T09:00:00+02:00",
      "access_allowed_from": "2024-01-20T08:30:00+02:00",
      "current_time": "2024-01-20T07:45:00+02:00"
    },
    "suggested_action": "Palun tulge tagasi kell 08:30 või hiljem"
  },
  "meta": {
    "request_id": "req_door002",
    "timestamp": "2024-01-20T07:45:00.000Z"
  }
}
```

**Response (Hardware Failure):**
```json
{
  "success": false,
  "error": {
    "code": "DOOR_STUCK",
    "message": "Ukse avamine ebaõnnestus",
    "details": {
      "attempts": 3,
      "last_error": "Timeout after 12000ms"
    },
    "suggested_action": "Kasutage alternatiivset PIN-koodi: 923847",
    "fallback": {
      "pin": "923847",
      "valid_until": "2024-01-20T10:15:00+02:00",
      "instructions": "Sisestage see kood kapi klaviatuuril"
    },
    "support_phone": "+372 600 1234",
    "incident_number": "INC-2024-0042"
  },
  "meta": {
    "request_id": "req_door003",
    "timestamp": "2024-01-20T09:16:00.000Z"
  }
}
```

---

## Returns

### Initiate Return

**Request:**
```http
POST /api/v1/bookings/book_abc123/return
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "condition_notes": "Kõik korras, probleeme ei esinenud",
  "photos": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "book_abc123",
    "booking_number": "RB-2024-000456",
    "status": "completed",
    "returned_at": "2024-01-20T16:45:00+02:00",
    "rental_summary": {
      "planned_duration_hours": 8,
      "actual_duration_hours": 7.75,
      "was_overdue": false,
      "overdue_minutes": 0
    },
    "charges": {
      "rental": "15.00",
      "overdue": "0.00",
      "damage": "0.00",
      "total_charged": "15.00"
    },
    "deposit_release": {
      "status": "processing",
      "amount": "50.00",
      "expected_by": "2024-01-25T00:00:00+02:00",
      "message": "Tagatisraha tagastatakse 3-5 tööpäeva jooksul"
    },
    "message": "Täname tagastamise eest! Kas soovite jätta tagasisidet?",
    "review_url": "https://rentbox.ee/review/book_abc123"
  },
  "meta": {
    "request_id": "req_return001",
    "timestamp": "2024-01-20T16:45:00.000Z"
  }
}
```

---

## Extensions

### Request Extension

**Request:**
```http
POST /api/v1/bookings/book_abc123/extend
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "new_end_at": "2024-01-20T21:00:00+02:00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "extension": {
      "id": "ext_abc123",
      "booking_id": "book_abc123",
      "original_end_at": "2024-01-20T17:00:00+02:00",
      "new_end_at": "2024-01-20T21:00:00+02:00",
      "additional_hours": 4,
      "pricing": {
        "additional_amount": "14.00",
        "tax": "3.08",
        "total": "17.08",
        "currency": "EUR",
        "breakdown": [
          { "description": "4 tundi × €3.50", "amount": "14.00" },
          { "description": "Käibemaks 22%", "amount": "3.08" }
        ]
      },
      "status": "pending_payment",
      "expires_at": "2024-01-20T16:55:00+02:00"
    },
    "payment_url": "https://rentbox.ee/pay/extension/ext_abc123"
  },
  "meta": {
    "request_id": "req_ext001",
    "timestamp": "2024-01-20T16:40:00.000Z"
  }
}
```

**Response (Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "EXTENSION_CONFLICT",
    "message": "Pikendamine selleks ajaks ei ole võimalik",
    "details": {
      "requested_end": "2024-01-20T21:00:00+02:00",
      "next_booking_starts": "2024-01-20T18:00:00+02:00"
    },
    "max_extension": {
      "until": "2024-01-20T17:30:00+02:00",
      "additional_minutes": 30,
      "additional_amount": "1.75"
    },
    "suggested_action": "Saate pikendada maksimaalselt kuni 17:30 (30 minutit)"
  },
  "meta": {
    "request_id": "req_ext002",
    "timestamp": "2024-01-20T16:40:00.000Z"
  }
}
```

---

## Admin Operations

### Dashboard Stats

**Request:**
```http
GET /api/v1/admin/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2024-01-20",
      "active_rentals": 42,
      "pickups_scheduled": 15,
      "pickups_completed": 8,
      "returns_expected": 18,
      "returns_completed": 12,
      "overdue": 2,
      "revenue": {
        "today": "1245.00",
        "mtd": "28450.00",
        "currency": "EUR"
      }
    },
    "alerts": [
      {
        "id": "alert_001",
        "type": "overdue",
        "severity": "high",
        "title": "Üle aja broneering",
        "message": "RB-2024-000445 on 2 tundi üle aja",
        "booking": {
          "id": "book_xyz",
          "booking_number": "RB-2024-000445",
          "customer_name": "Jaan Tamm",
          "customer_phone": "+37256123456",
          "product_name": "Makita Ketassaag",
          "overdue_by": "2 tundi"
        },
        "actions": ["contact_customer", "view_booking"]
      },
      {
        "id": "alert_002",
        "type": "locker_offline",
        "severity": "high",
        "title": "Kapp võrguühenduseta",
        "message": "L003 Tartu Keskus on võrguühenduseta 45 minutit",
        "locker": {
          "id": "lock_def",
          "code": "L003",
          "location": "Tartu Keskus",
          "offline_since": "2024-01-20T08:15:00+02:00"
        },
        "actions": ["view_locker", "create_incident"]
      }
    ],
    "recent_activity": [
      {
        "timestamp": "2024-01-20T09:12:00+02:00",
        "type": "booking_created",
        "description": "Uus broneering: RB-2024-000458",
        "user": "Mart Kask",
        "product": "Bosch Drill GSB 18V"
      },
      {
        "timestamp": "2024-01-20T09:08:00+02:00",
        "type": "return_completed",
        "description": "Tagastus: RB-2024-000442",
        "user": "Liis Mets",
        "product": "Makita Ketassaag"
      }
    ],
    "locker_status": {
      "total": 12,
      "online": 11,
      "offline": 1,
      "maintenance": 0
    }
  },
  "meta": {
    "request_id": "req_admin001",
    "timestamp": "2024-01-20T09:15:00.000Z"
  }
}
```

---

## Webhooks

### booking.confirmed

```json
{
  "id": "evt_abc123",
  "type": "booking.confirmed",
  "created_at": "2024-01-15T10:40:00.000Z",
  "data": {
    "booking": {
      "id": "book_abc123",
      "booking_number": "RB-2024-000456",
      "status": "confirmed",
      "user": {
        "id": "usr_xyz",
        "email": "jaan.tamm@email.ee",
        "name": "Jaan Tamm"
      },
      "product": {
        "id": "prod_001",
        "name": "Bosch Professional Drill GSB 18V-55",
        "sku": "DRILL-BOSCH-18V"
      },
      "location": {
        "id": "loc_abc123",
        "name": "Tallinn Keskus"
      },
      "time_window": {
        "start_at": "2024-01-20T09:00:00+02:00",
        "end_at": "2024-01-20T17:00:00+02:00"
      },
      "total_amount": "68.30",
      "currency": "EUR"
    }
  }
}
```

### booking.overdue

```json
{
  "id": "evt_def456",
  "type": "booking.overdue",
  "created_at": "2024-01-20T17:35:00.000Z",
  "data": {
    "booking": {
      "id": "book_xyz789",
      "booking_number": "RB-2024-000445",
      "status": "overdue",
      "user": {
        "id": "usr_abc",
        "email": "mart.kask@email.ee",
        "name": "Mart Kask",
        "phone": "+37256789012"
      },
      "product": {
        "id": "prod_002",
        "name": "Makita Ketassaag DHS680"
      },
      "time_window": {
        "start_at": "2024-01-20T09:00:00+02:00",
        "end_at": "2024-01-20T17:00:00+02:00"
      },
      "overdue_since": "2024-01-20T17:00:00+02:00",
      "overdue_minutes": 35,
      "overdue_charges_per_hour": "7.50"
    }
  }
}
```

### locker.door_opened

```json
{
  "id": "evt_ghi789",
  "type": "locker.door_opened",
  "created_at": "2024-01-20T09:15:00.000Z",
  "data": {
    "locker": {
      "id": "lock_abc123",
      "code": "L001",
      "location": "Tallinn Keskus"
    },
    "compartment": {
      "id": "comp_xyz789",
      "code": "A3"
    },
    "booking": {
      "id": "book_abc123",
      "booking_number": "RB-2024-000456"
    },
    "user": {
      "id": "usr_xyz",
      "name": "Jaan Tamm"
    },
    "access_type": "pickup",
    "timestamp": "2024-01-20T09:15:00.000Z"
  }
}
```

---

## Error Responses Summary

| HTTP Code | Error Code | Estonian Message |
|-----------|------------|------------------|
| 400 | `VALIDATION_ERROR` | Sisend on vigane |
| 401 | `UNAUTHORIZED` | Palun logige sisse |
| 403 | `FORBIDDEN` | Teil pole selleks õigust |
| 404 | `NOT_FOUND` | Ressurssi ei leitud |
| 409 | `BOOKING_CONFLICT` | See ajavahemik ei ole saadaval |
| 409 | `EXTENSION_CONFLICT` | Pikendamine ei ole võimalik |
| 402 | `PAYMENT_REQUIRED` | Makse on vajalik |
| 402 | `PAYMENT_FAILED` | Makse ebaõnnestus |
| 429 | `RATE_LIMITED` | Liiga palju päringuid |
| 500 | `INTERNAL_ERROR` | Süsteemi viga |
| 503 | `LOCKER_OFFLINE` | Kapp on ajutiselt kättesaamatu |
| 503 | `DOOR_STUCK` | Ukse avamine ebaõnnestus |
