# API Integration Guide

This document describes how to integrate the Rentbox.ee Dashboard with your backend API.

## Overview

The dashboard uses three main API endpoints to fetch user data:

1. `GET /api/me/dashboard` - Dashboard summary and quick overview
2. `GET /api/me/bookings` - All user bookings (active, upcoming, past)
3. `GET /api/me/invoices` - Invoices and signed agreements

## Authentication

All API requests should include an authentication token:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Implementing Authentication

Update `src/services/api.ts`:

```typescript
function getAuthToken(): string {
  // Replace with your authentication logic
  return localStorage.getItem('auth_token') || '';
}
```

For production, consider:
- httpOnly cookies
- Secure token storage
- Token refresh mechanism
- Session timeout handling

## API Endpoints

### 1. Dashboard Overview

**Endpoint:** `GET /api/me/dashboard`

**Response:**
```json
{
  "summary": {
    "activeRentalsCount": 2,
    "upcomingRentalsCount": 1,
    "pendingInvoicesCount": 1,
    "totalSpent": 245.50,
    "currency": "EUR"
  },
  "activeRentals": [
    {
      "id": "rental-123",
      "itemName": "Electric Drill Pro 2000",
      "itemType": "Power Tools",
      "status": "active",
      "startDate": "2024-12-26T10:00:00Z",
      "endDate": "2024-12-27T10:00:00Z",
      "lockerLocation": "Locker A-15, Tallinn Central Station",
      "lockerCode": "4782",
      "price": 25.00,
      "currency": "EUR",
      "imageUrl": "https://example.com/image.jpg"
    }
  ],
  "upcomingRentals": [...],
  "recentInvoices": [...]
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| summary.activeRentalsCount | number | Yes | Count of active rentals |
| summary.upcomingRentalsCount | number | Yes | Count of upcoming rentals |
| summary.pendingInvoicesCount | number | Yes | Count of pending invoices |
| summary.totalSpent | number | Yes | Total amount spent |
| summary.currency | string | Yes | Currency code (ISO 4217) |
| activeRentals | Rental[] | Yes | Array of active rentals |
| upcomingRentals | Rental[] | Yes | Array of upcoming rentals |
| recentInvoices | Invoice[] | Yes | Array of recent invoices |

### 2. User Bookings

**Endpoint:** `GET /api/me/bookings`

**Response:**
```json
{
  "active": [
    {
      "id": "rental-123",
      "itemName": "Electric Drill Pro 2000",
      "itemType": "Power Tools",
      "status": "active",
      "startDate": "2024-12-26T10:00:00Z",
      "endDate": "2024-12-27T10:00:00Z",
      "lockerLocation": "Locker A-15, Tallinn Central Station",
      "lockerCode": "4782",
      "price": 25.00,
      "currency": "EUR",
      "imageUrl": "https://example.com/image.jpg"
    }
  ],
  "upcoming": [...],
  "past": [...]
}
```

**Rental Object Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique rental identifier |
| itemName | string | Yes | Name of rented item |
| itemType | string | Yes | Category/type of item |
| status | enum | Yes | One of: 'active', 'upcoming', 'completed', 'cancelled' |
| startDate | string | Yes | ISO 8601 datetime |
| endDate | string | Yes | ISO 8601 datetime |
| lockerLocation | string | No | Physical location of locker |
| lockerCode | string | No | Access code for locker (only for active rentals) |
| price | number | Yes | Rental price |
| currency | string | Yes | Currency code (ISO 4217) |
| imageUrl | string | No | URL to item image |

**Status Values:**
- `active` - Currently rented
- `upcoming` - Future reservation
- `completed` - Past rental (returned)
- `cancelled` - Cancelled rental

### 3. Invoices and Agreements

**Endpoint:** `GET /api/me/invoices`

**Response:**
```json
{
  "invoices": [
    {
      "id": "inv-123",
      "invoiceNumber": "INV-2024-001234",
      "rentalId": "rental-123",
      "amount": 25.00,
      "currency": "EUR",
      "status": "paid",
      "issueDate": "2024-12-26T10:00:00Z",
      "dueDate": "2024-12-27T10:00:00Z",
      "paidDate": "2024-12-26T15:30:00Z",
      "paymentMethod": "card",
      "downloadUrl": "https://api.rentbox.ee/invoices/inv-123/download"
    }
  ],
  "agreements": [
    {
      "id": "agr-123",
      "rentalId": "rental-123",
      "agreementNumber": "AGR-2024-001234",
      "signedDate": "2024-12-26T10:00:00Z",
      "documentUrl": "https://api.rentbox.ee/agreements/agr-123/download",
      "documentType": "rental_agreement"
    }
  ]
}
```

**Invoice Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique invoice identifier |
| invoiceNumber | string | Yes | Human-readable invoice number |
| rentalId | string | Yes | Associated rental ID |
| amount | number | Yes | Invoice amount |
| currency | string | Yes | Currency code (ISO 4217) |
| status | enum | Yes | One of: 'paid', 'pending', 'overdue', 'cancelled' |
| issueDate | string | Yes | ISO 8601 datetime |
| dueDate | string | Yes | ISO 8601 datetime |
| paidDate | string | No | ISO 8601 datetime (if paid) |
| paymentMethod | enum | No | One of: 'card', 'bank_transfer', 'cash' |
| downloadUrl | string | Yes | URL to download PDF invoice |

**Agreement Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique agreement identifier |
| rentalId | string | Yes | Associated rental ID |
| agreementNumber | string | Yes | Human-readable agreement number |
| signedDate | string | Yes | ISO 8601 datetime |
| documentUrl | string | Yes | URL to download PDF agreement |
| documentType | enum | Yes | One of: 'rental_agreement', 'terms_conditions' |

### 4. Rent Again

**Endpoint:** `POST /api/rentals/{id}/rent-again`

**Request:**
- Path parameter: `id` - Original rental ID

**Response:**
```json
{
  "bookingId": "booking-456",
  "message": "Rental created successfully"
}
```

## Error Handling

All API endpoints should return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid rental ID provided",
    "details": {}
  }
}
```

## Rate Limiting

Recommended rate limits:
- Dashboard: 60 requests/minute
- Bookings: 30 requests/minute
- Invoices: 30 requests/minute
- Rent Again: 10 requests/minute

## CORS Configuration

Enable CORS for the dashboard domain:

```javascript
Access-Control-Allow-Origin: https://dashboard.rentbox.ee
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Security Best Practices

1. **Always use HTTPS** for API communication
2. **Validate authentication tokens** on every request
3. **Implement rate limiting** to prevent abuse
4. **Sanitize all inputs** to prevent injection attacks
5. **Never expose sensitive data** (admin fields, internal IDs)
6. **Log all API access** for security auditing
7. **Use proper CORS headers** to prevent unauthorized access

## Testing the API

### Using cURL

```bash
# Test dashboard endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.rentbox.ee/api/me/dashboard

# Test bookings endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.rentbox.ee/api/me/bookings

# Test rent again
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.rentbox.ee/api/rentals/rental-123/rent-again
```

### Using Postman

1. Create a new collection for Rentbox API
2. Set up environment variables:
   - `base_url`: `https://api.rentbox.ee`
   - `auth_token`: Your authentication token
3. Add requests for each endpoint
4. Use `{{base_url}}` and `{{auth_token}}` in requests

## Mock Data vs Production

The dashboard includes mock data for development:

```bash
# Development (uses mock data)
VITE_MOCK_API=true

# Production (uses real API)
VITE_MOCK_API=false
```

To switch from mock to production:
1. Update `.env` file
2. Ensure authentication is implemented
3. Test all API endpoints
4. Handle error cases properly

## Need Help?

- Review mock data implementation in `src/services/api.ts`
- Check TypeScript types in `src/types/index.ts`
- Test with mock data first before connecting to production API
- Validate all response formats match the expected structure
