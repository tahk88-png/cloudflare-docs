# Quick Start Guide

## Prerequisites

1. **PostgreSQL Database**
   ```bash
   createdb rentbox_ai
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in:
   - Database connection string
   - OpenAI API key
   - SMTP credentials (for email)
   - Twilio credentials (for SMS)
   - Locker API configuration

## Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate:up

# Seed sample data
npm run seed
```

## Running the Application

### Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### Background Worker

In a separate terminal:

```bash
npm run worker
```

The worker runs scheduled tasks:
- Hourly: 24h reminders
- Every 15 min: Overdue booking checks
- Every 5 min: Failed open processing

## Testing the Chat Widget

1. Visit http://localhost:3000
2. Click the chat widget button (bottom right)
3. Try messages like:
   - "I need help with my booking"
   - "What's the status of booking #1?"
   - "I want to book a locker"

## Admin Console

Visit http://localhost:3000/admin

- **Dashboard**: Risk metrics and quick links
- **Tickets**: View and manage support tickets
- **AI Actions**: Searchable log of all AI actions
- **Events**: View system events

## API Testing

### Send a Chat Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help",
    "booking_id": 1,
    "user_id": 1
  }'
```

### Submit an Event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "booking_confirmed",
    "event_data": {"booking_id": 1},
    "booking_id": 1,
    "user_id": 1
  }'
```

### Open Locker (with safety checks)

```bash
curl -X POST http://localhost:3000/api/locker/open \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "pickup_code": "ABC123"
  }'
```

## Sample Data

The seed script creates:
- 2 users (john.doe@example.com, jane.smith@example.com)
- 2 products (Standard, Premium)
- 2 lockers with compartments
- 2 bookings with payments
- Sample events and rules

## Next Steps

1. Configure your email/SMS providers
2. Set up your locker API endpoints
3. Customize message templates in the database
4. Add authentication/authorization for admin routes
5. Deploy to production

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists: `psql -l | grep rentbox_ai`

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is set
- Check API key is valid and has credits

### Email/SMS Not Sending
- Verify SMTP/Twilio credentials
- Check environment variables are set correctly
- Review logs for error messages
