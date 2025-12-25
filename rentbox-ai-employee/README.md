# Rentbox AI Employee v1.0

A comprehensive customer support chat widget and event-driven automation system for Rentbox locker rental service.

## Features

### 1. Customer Support Chat Widget
- AI-powered chat widget that can be embedded on rentbox.ee
- Identifies context via `booking_id` from deep links or logged-in session
- Routes messages through an orchestrator to 3 specialized role agents:
  - **Support Agent**: Handles general inquiries, booking issues, payment problems
  - **Ops Agent**: Handles technical locker issues, compartment access problems
  - **Sales Agent**: Helps with new bookings, product questions, pricing
- Tool calls: `get_booking`, `create_ticket`, `send_email`, `send_sms`, `log_ai_action`
- Stores all conversations and messages in the database

### 2. Event-driven Automation
- Stores webhook events (payment, locker, booking, etc.) in `events` table
- Rules engine processes events and scheduled time-based rules
- Sends automated messages:
  - Pickup instructions
  - 24-hour reminders
  - Overdue notices
- Creates tickets automatically on `open_failed` or repeated issues
- All actions logged to `ai_actions` with reason and outcome

### 3. Admin Console
- **Risk Dashboard**: Shows overdue bookings, open_failed events, payment_pending
- **Tickets List**: View and manage support tickets with status filtering
- **AI Actions Log**: Searchable log of all AI actions with filtering

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes + TypeScript
- **Database**: PostgreSQL
- **Background Worker**: node-cron for scheduled tasks
- **Email**: Nodemailer (SMTP)
- **SMS**: Twilio
- **AI**: OpenAI GPT-4 with function calling
- **Locker API**: HTTP/MQTT adapter abstraction

## Database Schema

- `users` - Customer users
- `products` - Rental products
- `lockers` - Locker locations
- `compartments` - Individual locker compartments
- `bookings` - Rental bookings (always has compartment_id)
- `payments` - Payment records
- `events` - Webhook events
- `messages` - Chat messages
- `ai_actions` - AI action audit log
- `tickets` - Support tickets
- `rules` - Automation rules
- `rate_limits` - Rate limiting tracking
- `message_templates` - Email/SMS templates

## Safety Features

- **No refunds or payment changes**: System does not modify payment records
- **Locker open validation**: Only allows opening if:
  - Booking is paid (`payment_status = 'completed'`)
  - Current time is within allowed window (`start_time <= now <= end_time`)
  - Compartment matches booking
- **Rate limiting**: Limits outbound messages per user per hour

## Setup

### Prerequisites

- Node.js 22+
- PostgreSQL 12+
- OpenAI API key
- SMTP credentials (for email)
- Twilio account (for SMS)

### Installation

1. Clone the repository and install dependencies:

```bash
cd rentbox-ai-employee
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Set up the database:

```bash
# Create database
createdb rentbox_ai

# Run migrations
npm run migrate:up

# Seed sample data
npm run seed
```

4. Start the development server:

```bash
npm run dev
```

5. Start the background worker (in a separate terminal):

```bash
npm run worker
```

## Usage

### Chat Widget

The chat widget can be embedded on any page:

```tsx
import ChatWidget from '@/components/ChatWidget';

<ChatWidget 
  bookingId={123}  // Optional: from URL params or session
  userId={456}    // Optional: logged-in user
  conversationId="conv_abc123"  // Optional: existing conversation
/>
```

### API Endpoints

#### Chat
- `POST /api/chat` - Send a message
- `GET /api/chat?conversation_id=...` - Get conversation history

#### Events
- `POST /api/events` - Submit a webhook event
- `GET /api/events` - List events

#### Admin
- `GET /api/admin/dashboard` - Get risk dashboard data
- `GET /api/admin/tickets` - List tickets
- `PATCH /api/admin/tickets` - Update ticket
- `GET /api/admin/ai-actions` - List AI actions

#### Locker
- `POST /api/locker/open` - Open locker (with safety checks)

### Background Worker

The worker runs scheduled tasks:
- **Hourly**: Send 24h reminders for bookings ending tomorrow
- **Every 15 minutes**: Check for overdue bookings and send notices
- **Every 5 minutes**: Process repeated `open_failed` events and create tickets

### Creating Automation Rules

Rules can be created via SQL or through the admin interface:

```sql
INSERT INTO rules (name, event_type, condition, action_type, action_config, enabled)
VALUES (
  'Send pickup instructions',
  'booking_confirmed',
  '{"type": "equals", "field": "event_type", "value": "booking_confirmed"}'::jsonb,
  'send_email',
  '{"template_name": "pickup_instructions"}'::jsonb,
  true
);
```

## Project Structure

```
rentbox-ai-employee/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin console pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ChatWidget.tsx     # Chat widget component
├── lib/                   # Library code
│   ├── ai/               # AI orchestrator and tools
│   ├── automation/       # Rules engine
│   ├── templates/        # Message templates
│   ├── db.ts             # Database client
│   ├── email.ts          # Email service
│   ├── sms.ts            # SMS service
│   ├── locker.ts         # Locker API abstraction
│   └── rate-limit.ts     # Rate limiting
├── migrations/           # Database migrations
├── scripts/              # Utility scripts
│   ├── seed.ts          # Seed data
│   └── worker.ts        # Background worker
└── package.json
```

## Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS configuration
- `LOCKER_API_URL`, `LOCKER_API_TYPE`, `LOCKER_MQTT_BROKER` - Locker API configuration
- `RATE_LIMIT_MESSAGES_PER_HOUR` - Rate limit (default: 10)

## Development

```bash
# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Create new migration
npm run migrate:create migration_name

# Seed database
npm run seed

# Run worker
npm run worker

# Development server
npm run dev
```

## Production Deployment

1. Set up environment variables in your hosting platform
2. Run migrations: `npm run migrate:up`
3. Build: `npm run build`
4. Start: `npm start`
5. Run worker as a separate process/service: `npm run worker`

## License

ISC
