# Notification Engine for Rentbox.ee

A comprehensive notification system for time-critical rental communications.

## Features

- **Multi-channel support**: Email, SMS, and WhatsApp (optional)
- **Event-driven**: Handles 6 critical rental events
- **Smart routing**: SMS only for urgent events, transactional priority
- **Retry logic**: Automatic retry with exponential backoff
- **Full logging**: Complete delivery audit trail
- **Admin API**: View notification logs and status

## Events

1. **booking_confirmed** - When a booking is confirmed
2. **30_min_before_start** - 30 minutes before rental starts (SMS)
3. **rental_started** - When rental begins
4. **15_min_before_end** - 15 minutes before rental ends (SMS)
5. **overdue_warning** - When rental is overdue (SMS)
6. **return_confirmed** - When return is confirmed

## API Endpoints

### POST /api/notifications/send

Send a notification.

**Request Body:**
```json
{
  "event": "booking_confirmed",
  "recipient": {
    "email": "user@example.com",
    "phone": "+37250123456",
    "name": "John Doe"
  },
  "channels": ["email", "sms"],
  "priority": "transactional",
  "data": {
    "bookingId": "12345",
    "startTime": "2024-01-15T10:00:00Z"
  },
  "bookingId": "12345",
  "rentalId": "rental-123"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "channel": "email",
      "success": true,
      "messageId": "msg-123",
      "logId": "log-456"
    },
    {
      "channel": "sms",
      "success": true,
      "messageId": "SM123456",
      "logId": "log-789"
    }
  ]
}
```

### GET /api/admin/notifications/logs

Get notification logs (requires admin authentication).

**Headers:**
```
Authorization: Bearer <ADMIN_API_KEY>
```

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `event` - Filter by event type
- `status` - Filter by status (pending, sent, failed, retrying, delivered, bounced)
- `bookingId` - Filter by booking ID
- `rentalId` - Filter by rental ID
- `recipient` - Filter by recipient email/phone
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)

**Response:**
```json
{
  "logs": [
    {
      "id": "log-123",
      "event": "booking_confirmed",
      "channel": "email",
      "recipient": "user@example.com",
      "status": "sent",
      "priority": "transactional",
      "bookingId": "12345",
      "attempts": 1,
      "createdAt": "2024-01-15T10:00:00Z",
      "sentAt": "2024-01-15T10:00:01Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 150
  }
}
```

## Setup

### 1. Create D1 Database

```bash
wrangler d1 create rentbox-notifications
```

Update `wrangler.toml` with the database ID.

### 2. Run Database Migration

The database schema is automatically created on first use. Alternatively, you can run:

```bash
wrangler d1 execute rentbox-notifications --file=./worker/notifications/schema.sql
```

### 3. Configure Environment Variables

Set these in your Cloudflare Workers environment:

**Email Configuration:**
- `NOTIFICATION_FROM_EMAIL` - Default sender email (default: noreply@rentbox.ee)
- `NOTIFICATION_FROM_NAME` - Default sender name (default: Rentbox.ee)
- `EMAIL_PROVIDER` - "cloudflare", "sendgrid", or "mailgun"
- `SENDGRID_API_KEY` - If using SendGrid
- `MAILGUN_API_KEY` - If using Mailgun

**SMS Configuration (Twilio):**
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_FROM_NUMBER` - Twilio phone number (e.g., +1234567890)

**WhatsApp Configuration (Optional):**
- `TWILIO_WHATSAPP_FROM` - Twilio WhatsApp Business number (e.g., whatsapp:+1234567890)

**Service Configuration:**
- `NOTIFICATION_MAX_RETRIES` - Max retry attempts (default: 3)
- `NOTIFICATION_RETRY_DELAY_MS` - Base retry delay in ms (default: 5000)

**Admin API:**
- `ADMIN_API_KEY` - Secret key for admin API access

### 4. Deploy

```bash
wrangler deploy
```

## Channel Selection Logic

- **Email**: Always sent for transactional messages
- **SMS**: Only sent for urgent events (30_min_before_start, 15_min_before_end, overdue_warning)
- **WhatsApp**: Optional, only if explicitly requested and configured

## Retry Logic

- Maximum 3 retries (configurable)
- Exponential backoff: 5s, 10s, 20s
- Configuration errors are not retried
- Each attempt is logged in the database

## Database Schema

The notification logs table includes:
- Event type and channel
- Recipient information
- Status and priority
- Retry attempts and timestamps
- Error messages and metadata
- Booking and rental IDs for tracking

## Usage Examples

### Send Booking Confirmation

```typescript
const response = await fetch('https://your-domain.com/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'booking_confirmed',
    recipient: {
      email: 'customer@example.com',
      name: 'John Doe'
    },
    channels: ['email'],
    priority: 'transactional',
    data: {
      bookingId: 'BK-12345',
      startTime: '2024-01-15T10:00:00Z',
      itemName: 'Bike Rental'
    },
    bookingId: 'BK-12345'
  })
});
```

### Send Urgent Reminder (SMS + Email)

```typescript
const response = await fetch('https://your-domain.com/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: '30_min_before_start',
    recipient: {
      email: 'customer@example.com',
      phone: '+37250123456'
    },
    channels: ['email', 'sms'],
    priority: 'transactional',
    data: {
      bookingId: 'BK-12345',
      startTime: '2024-01-15T10:00:00Z'
    },
    bookingId: 'BK-12345'
  })
});
```

## Testing

Test locally with:

```bash
wrangler dev
```

Then send requests to `http://localhost:8787/api/notifications/send`

## Monitoring

Monitor notification delivery through:
1. Admin API logs endpoint
2. Cloudflare Workers logs
3. Provider dashboards (Twilio, SendGrid, etc.)

## Security

- Admin API requires Bearer token authentication
- All sensitive credentials stored as environment variables
- Database access restricted to worker binding
