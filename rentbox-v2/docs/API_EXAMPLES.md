# API Examples & Payloads

## Checkout API

### Apply Discount Code

**POST** `/api/checkout/apply-code`

**Request:**
```json
{
  "code": "SUMMER2024",
  "cart": {
    "items": [
      {
        "product_id": "prod_123",
        "quantity": 1,
        "unit_price": 5000,
        "duration_minutes": 120,
        "locker_id": "locker_456",
        "compartment_id": "comp_789"
      }
    ],
    "subtotal": 5000,
    "deposit": 2000,
    "total": 7000,
    "locker_id": "locker_456",
    "city": "Helsinki",
    "region": "Uusimaa"
  },
  "user_id": "user_abc123",
  "booking_context": {
    "is_first_time": false,
    "is_b2b": false
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "type": "discount",
    "discount": {
      "id": "disc_xyz789",
      "code": "SUMMER2024",
      "type": "percentage",
      "discount_amount": 500,
      "new_subtotal": 4500,
      "new_total": 6500
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "CAMPAIGN_RULE_FAILED",
    "message": "Campaign only valid on Monday, Tuesday, Wednesday",
    "reason": "Campaign only valid on Monday, Tuesday, Wednesday"
  }
}
```

### Apply Voucher

**POST** `/api/checkout/apply-code`

**Request:**
```json
{
  "code": "GIFT-ABC123XYZ",
  "cart": {
    "items": [
      {
        "product_id": "prod_123",
        "quantity": 1,
        "unit_price": 5000,
        "duration_minutes": 120
      }
    ],
    "subtotal": 5000,
    "deposit": 2000,
    "total": 7000
  },
  "user_id": "user_abc123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "type": "voucher",
    "voucher": {
      "id": "vouch_xyz789",
      "code": "GIFT-ABC123XYZ",
      "applied_amount": 5000,
      "remaining_balance": 4500,
      "new_subtotal": 0,
      "new_total": 2000
    }
  }
}
```

## Gift Card API

### Purchase Gift Card

**POST** `/api/gift-cards/purchase`

**Request:**
```json
{
  "amount": 5000,
  "currency": "EUR",
  "recipient_email": "recipient@example.com",
  "gift_message": "Happy Birthday!",
  "expires_in_months": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "voucher_id": "vouch_abc123",
    "voucher_code": "GIFT-XYZ789ABC",
    "amount": 5000,
    "currency": "EUR",
    "expires_at": "2026-01-15T10:00:00Z",
    "payment_intent_id": "pi_stripe_123",
    "client_secret": "pi_stripe_123_secret_xyz"
  }
}
```

### Check Voucher Balance

**GET** `/api/vouchers/GIFT-XYZ789ABC`

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "GIFT-XYZ789ABC",
    "remaining_amount": 4500,
    "currency": "EUR",
    "expires_at": "2026-01-15T10:00:00Z",
    "is_active": true
  }
}
```

## Admin API

### Create Discount Code

**POST** `/api/admin/discounts`

**Request:**
```json
{
  "code": "WELCOME10",
  "type": "percentage",
  "value": 10,
  "is_stackable": false,
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_until": "2024-12-31T23:59:59Z",
  "max_uses": 1000,
  "min_order_amount": 2000,
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "disc_abc123",
    "code": "WELCOME10",
    "type": "percentage",
    "value": 10,
    "is_stackable": false,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z",
    "max_uses": 1000,
    "used_count": 0,
    "min_order_amount": 2000,
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

### Create Campaign

**POST** `/api/admin/campaigns`

**Request:**
```json
{
  "name": "Weekend Special",
  "description": "10% off on weekends",
  "is_active": true,
  "rules": {
    "time": {
      "weekdays": [0, 6],
      "time_windows": [
        {
          "start": "09:00",
          "end": "17:00",
          "timezone": "Europe/Helsinki"
        }
      ]
    },
    "location": {
      "cities": ["Helsinki", "Tampere"]
    },
    "booking": {
      "min_order_value": 3000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "camp_xyz789",
    "name": "Weekend Special",
    "description": "10% off on weekends",
    "is_active": true,
    "rules": {
      "time": {
        "weekdays": [0, 6],
        "time_windows": [
          {
            "start": "09:00",
            "end": "17:00",
            "timezone": "Europe/Helsinki"
          }
        ]
      },
      "location": {
        "cities": ["Helsinki", "Tampere"]
      },
      "booking": {
        "min_order_value": 3000
      }
    },
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

### Create Voucher Manually

**POST** `/api/admin/vouchers`

**Request:**
```json
{
  "code": "REFUND-ABC123",
  "initial_amount": 2500,
  "currency": "EUR",
  "expires_at": "2025-12-31T23:59:59Z",
  "purchased_by_user_id": null,
  "recipient_email": "customer@example.com",
  "gift_message": "Refund credit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "vouch_xyz789",
    "code": "REFUND-ABC123",
    "initial_amount": 2500,
    "remaining_amount": 2500,
    "currency": "EUR",
    "expires_at": "2025-12-31T23:59:59Z",
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

## Reports API

### Voucher Liability Report

**GET** `/api/admin/reports/voucher-liability?breakdown=true`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_outstanding_liability": 125000,
    "expired_count": 5,
    "expired_amount": 5000,
    "active_count": 150,
    "active_amount": 120000,
    "breakdown_by_month": [
      {
        "month": "2024-01",
        "sales": 50000,
        "redemptions": 30000,
        "net_liability": 20000
      },
      {
        "month": "2024-02",
        "sales": 60000,
        "redemptions": 40000,
        "net_liability": 20000
      }
    ]
  }
}
```

### Discount Usage Report

**GET** `/api/admin/reports/discount-usage?campaign_id=camp_xyz789&start_date=2024-01-01&end_date=2024-01-31`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": "camp_xyz789",
      "campaign_name": "Weekend Special",
      "discount_code_id": "disc_abc123",
      "discount_code": "WELCOME10",
      "total_redemptions": 45,
      "total_discount_amount": 22500,
      "avg_discount_amount": 500,
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": "2024-01-31T23:59:59Z"
    }
  ]
}
```
