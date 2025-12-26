# Quick Setup Guide

## 1. Create D1 Database

```bash
wrangler d1 create rentbox-notifications
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "NOTIFICATION_DB"
database_name = "rentbox-notifications"
database_id = "YOUR_DATABASE_ID_HERE"
```

## 2. Initialize Database Schema

```bash
wrangler d1 execute rentbox-notifications --file=./worker/notifications/schema.sql
```

Or the schema will be auto-created on first use.

## 3. Set Environment Variables

In Cloudflare Dashboard → Workers → Your Worker → Settings → Variables:

### Required
- `NOTIFICATION_FROM_EMAIL` - e.g., `noreply@rentbox.ee`
- `NOTIFICATION_FROM_NAME` - e.g., `Rentbox.ee`
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_FROM_NUMBER` - Your Twilio phone number (e.g., `+1234567890`)
- `ADMIN_API_KEY` - Secret key for admin API access

### Optional
- `EMAIL_PROVIDER` - `cloudflare`, `sendgrid`, or `mailgun` (default: cloudflare)
- `SENDGRID_API_KEY` - If using SendGrid
- `MAILGUN_API_KEY` - If using Mailgun
- `TWILIO_WHATSAPP_FROM` - WhatsApp Business number (e.g., `whatsapp:+1234567890`)
- `NOTIFICATION_MAX_RETRIES` - Default: `3`
- `NOTIFICATION_RETRY_DELAY_MS` - Default: `5000`

## 4. Deploy

```bash
wrangler deploy
```

## 5. Test

```bash
# Send a test notification
curl -X POST https://your-domain.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "event": "booking_confirmed",
    "recipient": {
      "email": "test@example.com",
      "name": "Test User"
    },
    "channels": ["email"],
    "priority": "transactional",
    "data": {
      "bookingId": "TEST-123",
      "startTime": "2024-01-15T10:00:00Z"
    },
    "bookingId": "TEST-123"
  }'

# View logs
curl https://your-domain.com/api/admin/notifications/logs \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

## Architecture

```
┌─────────────────┐
│  API Endpoints  │
│  /api/notifications/send │
│  /api/admin/notifications/logs │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │
│ Service        │
│ (Retry Logic)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────┐
│ Email  │ │ SMS  │ │ WhatsApp │ │ D1   │
│Channel │ │Channel│ │ Channel  │ │ Logs │
└────────┘ └──────┘ └──────────┘ └──────┘
```

## Event Flow

1. **Booking Confirmed** → Email only
2. **30 min before start** → Email + SMS (urgent)
3. **Rental Started** → Email only
4. **15 min before end** → Email + SMS (urgent)
5. **Overdue Warning** → Email + SMS (urgent)
6. **Return Confirmed** → Email only

## Channel Selection Rules

- **Email**: Always sent for transactional messages
- **SMS**: Only for urgent events (30_min_before_start, 15_min_before_end, overdue_warning)
- **WhatsApp**: Optional, only if explicitly requested and configured

## Monitoring

- Check logs via Admin API
- Monitor Twilio dashboard for SMS/WhatsApp delivery
- Monitor email provider dashboard for email delivery
- Check Cloudflare Workers logs for errors
