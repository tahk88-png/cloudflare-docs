# Rentbox v2 — Example Payloads

## Overview

This document provides example request/response payloads for key API operations.
Use these for API testing, documentation, and client development.

---

## 1. Booking Flow

### 1.1 Check Availability

**Request**:
```http
GET /api/v1/bookings/availability/prod_bosch-drill-123?locationId=loc_kristiine&startAt=2024-01-16T10:00:00%2B02:00&endAt=2024-01-16T18:00:00%2B02:00
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Available)**:
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "productId": "prod_bosch-drill-123",
    "locationId": "loc_kristiine",
    "requestedSlot": {
      "startAt": "2024-01-16T10:00:00+02:00",
      "endAt": "2024-01-16T18:00:00+02:00",
      "durationHours": 8
    },
    "availableCompartments": [
      {
        "compartmentId": "cmp_001",
        "lockerName": "Main Entrance Locker",
        "compartmentNumber": 3,
        "size": "MEDIUM"
      },
      {
        "compartmentId": "cmp_007",
        "lockerName": "Parking Garage Locker",
        "compartmentNumber": 2,
        "size": "MEDIUM"
      }
    ],
    "pricing": {
      "subtotal": "36.00",
      "taxAmount": "7.20",
      "deposit": "100.00",
      "total": "143.20",
      "currency": "EUR",
      "breakdown": {
        "method": "hourly",
        "hours": 8,
        "ratePerHour": "4.50"
      }
    }
  },
  "meta": {
    "requestId": "req_abc123def456",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

**Response (Not Available)**:
```json
{
  "success": true,
  "data": {
    "isAvailable": false,
    "productId": "prod_bosch-drill-123",
    "locationId": "loc_kristiine",
    "requestedSlot": {
      "startAt": "2024-01-16T10:00:00+02:00",
      "endAt": "2024-01-16T18:00:00+02:00"
    },
    "conflict": {
      "type": "EXISTING_BOOKING",
      "blockingUntil": "2024-01-16T14:00:00+02:00"
    },
    "alternatives": [
      {
        "startAt": "2024-01-16T14:00:00+02:00",
        "endAt": "2024-01-16T22:00:00+02:00",
        "compartmentId": "cmp_001",
        "isSameDuration": true
      },
      {
        "startAt": "2024-01-17T08:00:00+02:00",
        "endAt": "2024-01-17T16:00:00+02:00",
        "compartmentId": "cmp_001",
        "isSameDuration": true
      }
    ],
    "otherLocations": [
      {
        "locationId": "loc_lasnamae",
        "locationName": "Lasnamäe Centrum",
        "isAvailable": true,
        "distanceKm": 5.2
      }
    ]
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

---

### 1.2 Create Booking

**Request**:
```http
POST /api/v1/bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Idempotency-Key: idem_user123_20240115_booking_abc

{
  "productId": "prod_bosch-drill-123",
  "compartmentId": "cmp_001",
  "startAt": "2024-01-16T10:00:00+02:00",
  "endAt": "2024-01-16T18:00:00+02:00",
  "timezone": "Europe/Tallinn"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "bkg_xyz789abc123",
    "bookingNumber": "RB-20240115-A1B2C3D4",
    "status": "PENDING",
    "expiresAt": "2024-01-15T14:45:00+02:00",
    "product": {
      "id": "prod_bosch-drill-123",
      "name": "Bosch GSR 18V-55 Cordless Drill",
      "image": "https://cdn.rentbox.ee/products/bosch-drill.jpg"
    },
    "location": {
      "id": "loc_kristiine",
      "name": "Kristiine Keskus",
      "address": "Endla 45, 10615 Tallinn"
    },
    "compartment": {
      "id": "cmp_001",
      "lockerName": "Main Entrance Locker",
      "number": 3
    },
    "schedule": {
      "startAt": "2024-01-16T10:00:00+02:00",
      "endAt": "2024-01-16T18:00:00+02:00",
      "durationHours": 8,
      "timezone": "Europe/Tallinn"
    },
    "pricing": {
      "subtotal": "36.00",
      "taxAmount": "7.20",
      "deposit": "100.00",
      "total": "143.20",
      "currency": "EUR"
    },
    "nextSteps": {
      "action": "COMPLETE_CHECKOUT",
      "url": "/checkout/bkg_xyz789abc123",
      "expiresInSeconds": 900
    }
  },
  "meta": {
    "requestId": "req_create_123",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

---

### 1.3 Create Booking - Conflict Error

**Response (409 Conflict)**:
```json
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot was just booked by another customer.",
    "action": "Please select a different time.",
    "alternatives": [
      {
        "startAt": "2024-01-16T14:00:00+02:00",
        "endAt": "2024-01-16T22:00:00+02:00"
      }
    ]
  },
  "meta": {
    "requestId": "req_conflict_456",
    "timestamp": "2024-01-15T14:30:01.000Z"
  }
}
```

---

## 2. Checkout Flow

### 2.1 Get Contract for Signing

**Request**:
```http
GET /api/v1/checkout/chk_abc123/contract
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "ctr_456789",
    "templateName": "Standard Rental Agreement",
    "templateVersion": "2.1",
    "contentHtml": "<h1>Rendileping</h1><p>Käesolevaga kinnitab rentnik...</p>",
    "contentPlain": "RENDILEPING\n\nKäesolevaga kinnitab rentnik...",
    "keyTerms": [
      "Rendiperiood: 16.01.2024 10:00 - 18:00",
      "Tagastuskoht: Kristiine Keskus, Kapp #3",
      "Hilinemistasu: €6.75/tund pärast 30-minutilist armuaega",
      "Kahju vastutus: Kuni €500 asendushind"
    ],
    "signatureRequirement": {
      "method": "TYPED",
      "reason": "standard_rental",
      "alternativeMethods": []
    }
  },
  "meta": {
    "requestId": "req_contract_789",
    "timestamp": "2024-01-15T14:32:00.000Z"
  }
}
```

### 2.2 High-Value Contract (Requires Strong Auth)

**Response** (for amount > €200):
```json
{
  "success": true,
  "data": {
    "contractId": "ctr_highvalue_123",
    "signatureRequirement": {
      "method": "SMART_ID",
      "reason": "high_value_rental",
      "threshold": "200.00",
      "alternativeMethods": ["MOBILE_ID", "ID_CARD"]
    }
  }
}
```

---

### 2.3 Sign Contract (Typed Signature)

**Request**:
```http
POST /api/v1/checkout/chk_abc123/sign
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "method": "TYPED",
  "signature": "Jaan Tamm",
  "termsAccepted": true,
  "consentMarketing": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "ctr_456789",
    "status": "SIGNED",
    "signedAt": "2024-01-15T14:33:00.000Z",
    "contentHash": "sha256:a1b2c3d4e5f6789012345678901234567890abcdef",
    "nextStep": "PAYMENT"
  },
  "meta": {
    "requestId": "req_sign_101",
    "timestamp": "2024-01-15T14:33:00.000Z"
  }
}
```

---

### 2.4 Initiate Smart-ID Signing

**Request**:
```http
POST /api/v1/checkout/chk_abc123/sign/smart-id/initiate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "personalCode": "38001010001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sid_smartid_xyz",
    "verificationCode": "1234",
    "status": "WAITING",
    "message": "Kontrollige oma Smart-ID rakendust ja kinnitage koodiga 1234",
    "timeoutSeconds": 120
  },
  "meta": {
    "requestId": "req_smartid_init",
    "timestamp": "2024-01-15T14:33:30.000Z"
  }
}
```

---

### 2.5 Create Payment Intent

**Request**:
```http
POST /api/v1/checkout/chk_abc123/payment
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "paymentMethodId": "pm_card_visa_1234",
  "saveCard": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_stripe_abc123",
    "status": "REQUIRES_ACTION",
    "clientSecret": "pi_xxx_secret_yyy",
    "amount": "143.20",
    "currency": "EUR",
    "nextAction": {
      "type": "REDIRECT_TO_URL",
      "url": "https://checkout.stripe.com/pay/cs_xxx"
    }
  },
  "meta": {
    "requestId": "req_payment_init",
    "timestamp": "2024-01-15T14:34:00.000Z"
  }
}
```

---

### 2.6 Payment Confirmation

**Response** (after successful payment):
```json
{
  "success": true,
  "data": {
    "bookingId": "bkg_xyz789abc123",
    "bookingNumber": "RB-20240115-A1B2C3D4",
    "status": "PAID",
    "paymentStatus": "COMPLETED",
    "confirmation": {
      "message": "Teie rent on kinnitatud!",
      "accessInstructions": "Teie kapp on valmis 16. jaanuaril kell 10:00.",
      "accessPin": "1234",
      "location": {
        "name": "Kristiine Keskus",
        "address": "Endla 45, 10615 Tallinn",
        "locker": "Main Entrance Locker",
        "compartment": 3
      },
      "calendarLinks": {
        "google": "https://calendar.google.com/calendar/render?action=TEMPLATE&...",
        "ics": "https://api.rentbox.ee/calendar/bkg_xyz789abc123.ics"
      }
    }
  },
  "meta": {
    "requestId": "req_payment_confirm",
    "timestamp": "2024-01-15T14:35:00.000Z"
  }
}
```

---

## 3. Locker Access

### 3.1 Open Locker - Success

**Request**:
```http
POST /api/v1/locker/open
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "bookingId": "bkg_xyz789abc123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "eventId": "evt_open_abc123",
    "compartmentId": "cmp_001",
    "lockerName": "Main Entrance Locker",
    "compartmentNumber": 3,
    "status": "OPENED",
    "message": "Sahtel #3 on nüüd avatud. Võtke oma tööriist.",
    "autoCloseSeconds": 60
  },
  "meta": {
    "requestId": "req_locker_open",
    "timestamp": "2024-01-16T10:00:30.000Z"
  }
}
```

---

### 3.2 Open Locker - Too Early

**Response (403 Forbidden)**:
```json
{
  "success": false,
  "error": {
    "code": "TOO_EARLY",
    "message": "Teie rent algab kell 10:00. Ligipääs avaneb 15 minutit enne.",
    "details": {
      "currentTime": "2024-01-16T09:30:00+02:00",
      "accessAvailableAt": "2024-01-16T09:45:00+02:00"
    }
  },
  "meta": {
    "requestId": "req_locker_early",
    "timestamp": "2024-01-16T09:30:00.000Z"
  }
}
```

---

### 3.3 Open Locker - Hardware Timeout

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "LOCKER_TIMEOUT",
    "message": "Kapp ei vastanud. Palun proovige uuesti.",
    "details": {
      "attempt": 2,
      "attemptsRemaining": 1
    },
    "action": "Vajutage 'Proovi uuesti' või kasutage PIN-koodi klahvistikul.",
    "fallback": {
      "type": "PIN",
      "pin": "1234",
      "instructions": "Sisestage PIN 1234 kapi klahvistikul, et avada sahtel #3."
    }
  },
  "meta": {
    "requestId": "req_locker_timeout",
    "timestamp": "2024-01-16T10:00:35.000Z"
  }
}
```

---

### 3.4 Open Locker - Max Attempts Reached

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "MAX_ATTEMPTS_REACHED",
    "message": "Maksimaalne rakenduse avamiskatsete arv saavutatud. Palun kasutage PIN-koodi.",
    "fallback": {
      "type": "PIN",
      "pin": "1234",
      "instructions": "Sisestage PIN 1234 kapi klahvistikul, et avada sahtel #3."
    }
  },
  "meta": {
    "requestId": "req_locker_max_attempts",
    "timestamp": "2024-01-16T10:01:00.000Z"
  }
}
```

---

## 4. Return Flow

### 4.1 Initiate Return

**Request**:
```http
POST /api/v1/return/initiate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "bookingId": "bkg_xyz789abc123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "returnId": "ret_return_123",
    "bookingId": "bkg_xyz789abc123",
    "compartment": {
      "lockerName": "Main Entrance Locker",
      "number": 3,
      "status": "READY_FOR_RETURN"
    },
    "instructions": [
      "Avage sahtel rakenduse või PIN-koodiga",
      "Asetage tööriist sisse",
      "Sulgege uks kindlalt",
      "Soovi korral tehke tagastatavast esemest foto"
    ],
    "returnDeadline": "2024-01-16T18:00:00+02:00",
    "isWithinTime": true,
    "timeRemaining": {
      "hours": 2,
      "minutes": 30
    }
  },
  "meta": {
    "requestId": "req_return_init",
    "timestamp": "2024-01-16T15:30:00.000Z"
  }
}
```

---

### 4.2 Confirm Return

**Request**:
```http
POST /api/v1/return/ret_return_123/confirm
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "condition": "GOOD",
  "notes": "Kõik osad olemas, aku laetud"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "returnId": "ret_return_123",
    "status": "PENDING_VERIFICATION",
    "returnedAt": "2024-01-16T17:45:00+02:00",
    "isOnTime": true,
    "depositStatus": "PENDING_RELEASE",
    "message": "Aitäh tagastamise eest! Teie tagatisraha vabastatakse 24 tunni jooksul pärast kontrollimist."
  },
  "meta": {
    "requestId": "req_return_confirm",
    "timestamp": "2024-01-16T17:45:00.000Z"
  }
}
```

---

### 4.3 Return with Late Fee

**Response** (returned after deadline):
```json
{
  "success": true,
  "data": {
    "returnId": "ret_return_456",
    "status": "PENDING_VERIFICATION",
    "returnedAt": "2024-01-16T20:15:00+02:00",
    "isOnTime": false,
    "lateFee": {
      "amount": "13.50",
      "hours": 2,
      "ratePerHour": "6.75",
      "breakdown": "2 tundi × €4.50 × 1.5 hilinemiskoefitsient"
    },
    "depositStatus": "PARTIAL_HOLD",
    "message": "Tagastatud 2 tundi pärast tähtaega. Hilinemistasu €13.50 arvatakse tagatisrahast maha."
  },
  "meta": {
    "requestId": "req_return_late",
    "timestamp": "2024-01-16T20:15:00.000Z"
  }
}
```

---

## 5. User Dashboard

### 5.1 Get My Rentals

**Request**:
```http
GET /api/v1/me/rentals?status=active,upcoming,past&page=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "active": [
      {
        "id": "bkg_xyz789abc123",
        "bookingNumber": "RB-20240116-A1B2C3D4",
        "product": {
          "name": "Bosch GSR 18V-55",
          "image": "https://cdn.rentbox.ee/products/bosch-drill-thumb.jpg",
          "slug": "bosch-gsr-18v-55"
        },
        "location": {
          "name": "Kristiine Keskus",
          "address": "Endla 45, Tallinn"
        },
        "schedule": {
          "startAt": "2024-01-16T10:00:00+02:00",
          "endAt": "2024-01-16T18:00:00+02:00",
          "timezone": "Europe/Tallinn"
        },
        "status": "ACTIVE",
        "timeRemaining": {
          "hours": 3,
          "minutes": 45,
          "seconds": 12,
          "totalSeconds": 13512,
          "isUrgent": false
        },
        "access": {
          "canOpenLocker": true,
          "accessPin": "1234",
          "attemptsRemaining": 3
        },
        "actions": {
          "canExtend": true,
          "canReturn": true,
          "canCancel": false
        }
      }
    ],
    "upcoming": [
      {
        "id": "bkg_upcoming_456",
        "bookingNumber": "RB-20240117-E5F6G7H8",
        "product": {
          "name": "Makita Ketassaag",
          "image": "https://cdn.rentbox.ee/products/makita-saw-thumb.jpg",
          "slug": "makita-ketassaag"
        },
        "schedule": {
          "startAt": "2024-01-17T08:00:00+02:00",
          "endAt": "2024-01-17T20:00:00+02:00"
        },
        "status": "PAID",
        "startsIn": {
          "days": 0,
          "hours": 18,
          "totalHours": 18
        },
        "actions": {
          "canCancel": true,
          "cancellationDeadline": "2024-01-16T20:00:00+02:00"
        }
      }
    ],
    "past": [
      {
        "id": "bkg_past_789",
        "bookingNumber": "RB-20240110-PAST123",
        "product": {
          "name": "DeWalt Lööktrell",
          "slug": "dewalt-looktrell"
        },
        "schedule": {
          "startAt": "2024-01-10T10:00:00+02:00",
          "endAt": "2024-01-10T18:00:00+02:00",
          "actualReturnAt": "2024-01-10T17:45:00+02:00"
        },
        "status": "COMPLETED",
        "totalPaid": "43.20",
        "actions": {
          "canRentAgain": true,
          "canDownloadInvoice": true
        }
      }
    ]
  },
  "meta": {
    "requestId": "req_my_rentals",
    "timestamp": "2024-01-16T14:15:00.000Z"
  }
}
```

---

## 6. Admin Operations

### 6.1 Create Incident

**Request**:
```http
POST /api/v1/incidents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "type": "LOCKER_MALFUNCTION",
  "severity": "P2",
  "title": "Sahtel #3 ei avane",
  "description": "Klient teatab, et sahtel ei avane pärast 3 katset",
  "bookingId": "bkg_xyz789abc123",
  "lockerId": "lkr_001",
  "compartmentId": "cmp_003"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "inc_abc123",
    "incidentNumber": "INC-20240116-ABC123",
    "type": "LOCKER_MALFUNCTION",
    "severity": "P2",
    "status": "OPEN",
    "title": "Sahtel #3 ei avane",
    "createdAt": "2024-01-16T14:30:00.000Z",
    "responseSla": "2024-01-16T15:30:00.000Z"
  },
  "meta": {
    "requestId": "req_incident_create",
    "timestamp": "2024-01-16T14:30:00.000Z"
  }
}
```

---

### 6.2 Admin Calendar Timeline

**Request**:
```http
GET /api/v1/admin/calendar/timeline?lockerId=lkr_001&date=2024-01-16
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lockerId": "lkr_001",
    "lockerName": "Main Entrance Locker",
    "date": "2024-01-16",
    "timezone": "Europe/Tallinn",
    "compartments": [
      {
        "compartmentId": "cmp_001",
        "number": 1,
        "size": "MEDIUM",
        "status": "AVAILABLE",
        "events": [
          {
            "type": "BOOKING",
            "bookingId": "bkg_001",
            "bookingNumber": "RB-20240116-XYZ",
            "customerName": "Jaan Tamm",
            "productName": "Bosch Drill",
            "status": "PAID",
            "startAt": "2024-01-16T10:00:00+02:00",
            "endAt": "2024-01-16T14:00:00+02:00",
            "color": "#22C55E"
          },
          {
            "type": "BOOKING",
            "bookingId": "bkg_002",
            "bookingNumber": "RB-20240116-ABC",
            "customerName": "Mari Mets",
            "productName": "Bosch Drill",
            "status": "PENDING",
            "startAt": "2024-01-16T16:00:00+02:00",
            "endAt": "2024-01-16T20:00:00+02:00",
            "color": "#F59E0B"
          }
        ]
      },
      {
        "compartmentId": "cmp_002",
        "number": 2,
        "size": "LARGE",
        "status": "MAINTENANCE",
        "events": [
          {
            "type": "MAINTENANCE",
            "maintenanceId": "mnt_001",
            "reason": "Servo vahetus",
            "startAt": "2024-01-16T08:00:00+02:00",
            "endAt": "2024-01-16T18:00:00+02:00",
            "color": "#6B7280"
          }
        ]
      }
    ]
  },
  "meta": {
    "requestId": "req_admin_timeline",
    "timestamp": "2024-01-16T09:00:00.000Z"
  }
}
```

---

## 7. Webhook Payloads

### 7.1 Booking Confirmed Webhook

```json
{
  "id": "evt_webhook_booking_confirmed",
  "type": "booking.confirmed",
  "createdAt": "2024-01-15T14:35:00.000Z",
  "data": {
    "bookingId": "bkg_xyz789abc123",
    "bookingNumber": "RB-20240115-A1B2C3D4",
    "userId": "usr_customer_123",
    "productId": "prod_bosch-drill-123",
    "productName": "Bosch GSR 18V-55",
    "locationId": "loc_kristiine",
    "locationName": "Kristiine Keskus",
    "startAt": "2024-01-16T10:00:00+02:00",
    "endAt": "2024-01-16T18:00:00+02:00",
    "totalAmount": "143.20",
    "currency": "EUR"
  }
}
```

### 7.2 Locker Event Webhook

```json
{
  "id": "evt_webhook_locker_opened",
  "type": "locker.opened",
  "createdAt": "2024-01-16T10:00:30.000Z",
  "data": {
    "eventId": "evt_open_abc123",
    "lockerId": "lkr_001",
    "lockerExternalId": "LOCKER-KR-001",
    "compartmentId": "cmp_001",
    "compartmentNumber": 3,
    "bookingId": "bkg_xyz789abc123",
    "userId": "usr_customer_123",
    "method": "APP",
    "success": true,
    "hardwareResponseMs": 234
  }
}
```

### 7.3 Overdue Alert Webhook

```json
{
  "id": "evt_webhook_booking_overdue",
  "type": "booking.overdue",
  "createdAt": "2024-01-16T18:31:00.000Z",
  "data": {
    "bookingId": "bkg_xyz789abc123",
    "bookingNumber": "RB-20240115-A1B2C3D4",
    "userId": "usr_customer_123",
    "endedAt": "2024-01-16T18:00:00+02:00",
    "overdueMinutes": 31,
    "lateFeeAccruing": true,
    "currentLateFee": "6.75"
  }
}
```

---

## 8. Error Response Examples

### 8.1 Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vigased sisendandmed",
    "details": {
      "fields": [
        {
          "field": "startAt",
          "message": "Algusaeg peab olema tulevikus"
        },
        {
          "field": "endAt",
          "message": "Lõppaeg peab olema pärast algusaega"
        }
      ]
    }
  },
  "meta": {
    "requestId": "req_validation_error",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

### 8.2 Authentication Error

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Seanss aegunud. Palun logige uuesti sisse.",
    "action": "Suunatakse sisselogimislehele..."
  },
  "meta": {
    "requestId": "req_auth_error",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

### 8.3 Rate Limit Error

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Liiga palju päringuid. Palun oodake.",
    "retryAfter": 30
  },
  "meta": {
    "requestId": "req_rate_limit",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```

### 8.4 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Midagi läks valesti. Palun proovige uuesti.",
    "action": "Kui probleem püsib, võtke ühendust klienditoega."
  },
  "meta": {
    "requestId": "req_internal_error",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
}
```
