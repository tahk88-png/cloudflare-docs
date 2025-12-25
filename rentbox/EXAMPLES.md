# API Examples

## Complete Booking Flow

### 1. Create Cart

**Request:**
```http
POST /api/cart
Content-Type: application/json

{
  "user_id": "user_123",
  "session_id": "session_abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user_123",
    "session_id": "session_abc",
    "status": "active",
    "expires_at": "2024-12-25T15:30:00Z",
    "created_at": "2024-12-25T15:15:00Z",
    "updated_at": "2024-12-25T15:15:00Z"
  }
}
```

### 2. Add Item to Cart

**Request:**
```http
POST /api/cart/550e8400-e29b-41d4-a716-446655440000/items
Content-Type: application/json

{
  "product_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "start_at": "2024-12-26T09:00:00Z",
  "end_at": "2024-12-28T18:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4789-0abc-def123456789",
    "cart_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "start_at": "2024-12-26T09:00:00Z",
    "end_at": "2024-12-28T18:00:00Z",
    "price": 56.50,
    "deposit": 50.00,
    "pricing_breakdown": {
      "base_price": 50.00,
      "hours": 57,
      "days": 2,
      "hourly_rate": 5.00,
      "daily_rate": 25.00,
      "subtotal": 50.00,
      "adjustments": [
        {
          "type": "multiplier",
          "name": "Weekend Multiplier",
          "amount": 6.50,
          "percentage": 13,
          "applied_to": 50.00
        }
      ],
      "total": 56.50,
      "deposit": 50.00,
      "currency": "EUR"
    },
    "created_at": "2024-12-25T15:16:00Z",
    "updated_at": "2024-12-25T15:16:00Z"
  }
}
```

### 3. Get Cart

**Request:**
```http
GET /api/cart/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user_123",
      "status": "active",
      "expires_at": "2024-12-25T15:30:00Z",
      "items": [
        {
          "id": "a1b2c3d4-e5f6-4789-0abc-def123456789",
          "product_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "start_at": "2024-12-26T09:00:00Z",
          "end_at": "2024-12-28T18:00:00Z",
          "price": 56.50,
          "deposit": 50.00,
          "product": {
            "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            "name": "Drill - Makita 18V",
            "description": "Professional cordless drill with 2 batteries",
            "category": "power_tools",
            "base_price_hourly": 5.00,
            "base_price_daily": 25.00,
            "deposit_amount": 50.00
          }
        }
      ]
    },
    "totals": {
      "subtotal": 56.50,
      "total_deposit": 50.00,
      "total": 106.50
    },
    "items_count": 1,
    "expires_in_seconds": 840
  }
}
```

### 4. Validate Cart

**Request:**
```http
POST /api/cart/550e8400-e29b-41d4-a716-446655440000/validate
```

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "issues": []
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "issues": [
      {
        "item_id": "a1b2c3d4-e5f6-4789-0abc-def123456789",
        "message": "Drill - Makita 18V is no longer available for the selected time"
      }
    ]
  }
}
```

### 5. Checkout

**Request:**
```http
POST /api/cart/550e8400-e29b-41d4-a716-446655440000/checkout
Content-Type: application/json

{
  "return_url": "https://rentbox.ee/success",
  "cancel_url": "https://rentbox.ee/cancel",
  "user_email": "customer@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440000",
    "payment_id": "pay_abc123",
    "client_secret": "pi_1234567890_secret_abcdefghijklmnop"
  }
}
```

### 6. Payment Webhook (Automatic)

**Stripe sends webhook to:**
```http
POST /api/payments/webhook
Stripe-Signature: t=1234567890,v1=signature_here
Content-Type: application/json

{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 10650,
      "currency": "eur",
      "status": "succeeded",
      "metadata": {
        "cart_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_email": "customer@example.com"
      }
    }
  }
}
```

**System automatically:**
1. Updates payment status to "succeeded"
2. Creates bookings from cart items
3. Assigns compartments
4. Generates access codes
5. Releases cart locks
6. Marks cart as "converted"

### 7. Get Booking

**Request:**
```http
GET /api/bookings/booking_id_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_123",
    "cart_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "compartment_id": "comp_456",
    "user_id": "user_123",
    "start_at": "2024-12-26T09:00:00Z",
    "end_at": "2024-12-28T18:00:00Z",
    "status": "confirmed",
    "total_price": 56.50,
    "deposit_amount": 50.00,
    "pickup_code": "ABCD1234",
    "return_code": "XYZE9876",
    "product": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Drill - Makita 18V",
      "description": "Professional cordless drill with 2 batteries"
    },
    "compartment": {
      "id": "comp_456",
      "locker_id": "LOC-A-001",
      "compartment_number": 3,
      "size": "medium"
    },
    "pricing_breakdown": {
      "base_price": 50.00,
      "hours": 57,
      "days": 2,
      "total": 56.50,
      "deposit": 50.00,
      "currency": "EUR"
    },
    "created_at": "2024-12-25T15:20:00Z"
  }
}
```

## Extend Booking

**Request:**
```http
POST /api/bookings/booking_123/extend
Content-Type: application/json

{
  "new_end_at": "2024-12-29T18:00:00Z",
  "user_email": "customer@example.com"
}
```

**Response (Available):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking_123",
      "end_at": "2024-12-29T18:00:00Z",
      "total_price": 81.50,
      "status": "confirmed"
    },
    "additional_payment": 25.00,
    "payment_required": true,
    "client_secret": "pi_extension_secret",
    "payment_id": "pay_ext_123"
  }
}
```

**Response (Not Available):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "error": "Compartment is not available for the requested extension period",
    "details": {
      "alternative_end": "2024-12-29T12:00:00Z"
    }
  }
}
```

## Admin Examples

### Get System Stats

**Request:**
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "active_carts": 12,
    "expired_carts": 145,
    "confirmed_bookings": 89,
    "active_bookings": 34,
    "completed_bookings": 567,
    "active_locks": 28,
    "successful_payments": 645,
    "total_revenue": 15420.50
  }
}
```

### Get Compartment Timeline

**Request:**
```http
GET /api/admin/bookings/timeline/comp_456?from_date=2024-12-25&to_date=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking_123",
      "start_at": "2024-12-26T09:00:00Z",
      "end_at": "2024-12-28T18:00:00Z",
      "status": "confirmed",
      "product": {
        "name": "Drill - Makita 18V"
      }
    },
    {
      "id": "booking_124",
      "start_at": "2024-12-29T08:00:00Z",
      "end_at": "2024-12-30T20:00:00Z",
      "status": "confirmed",
      "product": {
        "name": "Circular Saw - DeWalt"
      }
    }
  ]
}
```

## Error Examples

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "error": "Validation failed",
    "details": [
      {
        "path": ["end_at"],
        "message": "End date must be after start date"
      }
    ]
  }
}
```

### Availability Error

```json
{
  "success": false,
  "error": {
    "code": "AVAILABILITY_ERROR",
    "error": "No compartments available for this time range",
    "details": {
      "product_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "start_at": "2024-12-26T09:00:00Z",
      "end_at": "2024-12-28T18:00:00Z"
    }
  }
}
```

### Cart Expired

```json
{
  "success": false,
  "error": {
    "code": "CART_EXPIRED",
    "error": "Cart has expired"
  }
}
```

### Payment Error

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_ERROR",
    "error": "Payment intent creation failed",
    "details": {
      "message": "Insufficient funds"
    }
  }
}
```

## Pricing Breakdown Examples

### Simple Hourly Rental

```json
{
  "base_price": 15.00,
  "hours": 3,
  "days": 0,
  "hourly_rate": 5.00,
  "daily_rate": 25.00,
  "subtotal": 15.00,
  "adjustments": [],
  "total": 15.00,
  "deposit": 50.00,
  "currency": "EUR"
}
```

### Multi-Day with Weekend Multiplier

```json
{
  "base_price": 75.00,
  "hours": 72,
  "days": 3,
  "hourly_rate": 5.00,
  "daily_rate": 25.00,
  "subtotal": 75.00,
  "adjustments": [
    {
      "type": "multiplier",
      "name": "Weekend Multiplier",
      "amount": 22.50,
      "percentage": 30,
      "applied_to": 75.00
    }
  ],
  "total": 97.50,
  "deposit": 50.00,
  "currency": "EUR"
}
```

### Long Rental with Discount

```json
{
  "base_price": 175.00,
  "hours": 168,
  "days": 7,
  "hourly_rate": 5.00,
  "daily_rate": 25.00,
  "subtotal": 175.00,
  "adjustments": [
    {
      "type": "discount",
      "name": "Long Rental Discount (7+ days)",
      "amount": -35.00,
      "percentage": 20,
      "applied_to": 175.00
    }
  ],
  "total": 140.00,
  "deposit": 50.00,
  "currency": "EUR"
}
```

### Peak Hours + Duration Discount

```json
{
  "base_price": 100.00,
  "hours": 96,
  "days": 4,
  "hourly_rate": 5.00,
  "daily_rate": 25.00,
  "subtotal": 100.00,
  "adjustments": [
    {
      "type": "multiplier",
      "name": "Peak Hours Multiplier",
      "amount": 20.00,
      "percentage": 20,
      "applied_to": 100.00
    },
    {
      "type": "discount",
      "name": "Long Rental Discount (3+ days)",
      "amount": -12.00,
      "percentage": 10,
      "applied_to": 120.00
    }
  ],
  "total": 108.00,
  "deposit": 50.00,
  "currency": "EUR"
}
```
