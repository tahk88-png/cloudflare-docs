# 🤖 Rentbox AI Employee v1.0

An intelligent AI-powered customer support and operations automation system for equipment rental businesses.

## Features

### 1. Customer Support Chat Widget
- **Multi-agent orchestration** with Support, Operations, and Sales roles
- **Context-aware routing** based on message content and conversation history
- **Tool-calling capabilities**: get_booking, create_ticket, send_email, send_sms, open_locker
- **Deep link support** for booking-specific context (e.g., `?booking_id=xxx`)
- **Real-time conversation** with typing indicators

### 2. Event-driven Automation
- **Webhook ingestion** for payment, locker, and booking events
- **Rules engine** with event-based and scheduled triggers
- **Automated messaging**: pickup instructions, return reminders, overdue notices
- **Automatic ticket creation** for failures and issues
- **Complete audit trail** via ai_actions table

### 3. Admin Console
- **Risk Dashboard**: overdue bookings, locker failures, pending payments
- **Tickets Management**: filterable list with status updates
- **AI Actions Log**: searchable audit trail with detailed views

### 4. Safety Features
- ❌ No refund or payment processing (humans only)
- ✅ Locker access only for paid bookings within allowed time windows
- ✅ Compartment verification before opening
- ✅ Rate limiting for outbound messages per user
- ✅ Complete action logging with reasons

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o with tool calling
- **Background Jobs**: node-cron worker process
- **Email**: Nodemailer (SMTP)
- **SMS**: Twilio API

## Database Schema

```
users              - Customer and admin accounts
products           - Rentable equipment
lockers            - Physical locker units
compartments       - Individual compartments (always linked to bookings)
bookings           - Rental bookings with status tracking
payments           - Payment records
events             - Webhook and system events
conversations      - Chat conversation threads
messages           - Individual chat messages
templates          - Email/SMS templates
rules              - Automation rules
ai_actions         - Complete AI decision audit log
tickets            - Support tickets
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- (Optional) Twilio account for SMS
- (Optional) SMTP server for email

### Installation

```bash
# Clone and enter directory
cd rentbox-ai-employee

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or create migrations (production)
npm run db:migrate

# Seed sample data
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/rentbox_ai"

# OpenAI
OPENAI_API_KEY="sk-..."

# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@example.com"
SMTP_PASS="password"
SMTP_FROM="Rentbox <noreply@rentbox.ee>"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Rate Limiting
MAX_MESSAGES_PER_USER_PER_HOUR="10"
MAX_MESSAGES_PER_USER_PER_DAY="50"

# Worker
WORKER_ENABLED="true"
CRON_REMINDER_SCHEDULE="0 */6 * * *"
CRON_OVERDUE_SCHEDULE="0 9 * * *"
```

## API Reference

### Chat API

```
POST /api/chat
{
  "message": "Hello, I need help with my booking",
  "userId": "uuid",
  "bookingId": "uuid (optional)",
  "context": { "source": "deep_link" }
}

Response:
{
  "conversationId": "uuid",
  "response": "AI response text",
  "agentRole": "SUPPORT",
  "toolCalls": [{ "name": "get_booking", "args": {}, "result": {} }]
}
```

### Events API

```
POST /api/events
{
  "type": "PAYMENT_COMPLETED",
  "source": "webhook",
  "bookingId": "uuid",
  "paymentId": "uuid",
  "payload": { ... }
}
```

### Admin Dashboard

```
GET /api/admin/dashboard
Returns: risk metrics, summary stats, recent actions
```

### Tickets

```
GET /api/admin/tickets?status=OPEN&priority=HIGH
POST /api/admin/tickets
PATCH /api/admin/tickets?id=uuid
```

### AI Actions

```
GET /api/admin/actions?search=email&outcome=SUCCESS
```

### Locker

```
POST /api/locker
{
  "bookingId": "uuid",
  "accessCode": "RB-123456",
  "reason": "Customer requested access"
}

GET /api/locker?lockerId=uuid
GET /api/locker?location=Tallinn
```

## Background Worker

The worker runs scheduled jobs for:
- **Event processing**: Every 5 minutes
- **Scheduled rules**: Every hour
- **Return reminders**: Every 6 hours (configurable)
- **Overdue checks**: Daily at 9 AM (configurable)

```bash
# Run worker separately
npm run worker
```

## Chat Widget Integration

Embed on your website:

```tsx
import ChatWidget from '@/components/chat/ChatWidget';

<ChatWidget
  userId="customer-uuid"
  bookingId="booking-uuid"  // Optional: for context
  context={{ source: 'booking_page' }}
  position="bottom-right"
  primaryColor="#2563eb"
/>
```

## Automation Rules

Rules are defined in the database and can:
- **Trigger on events**: PAYMENT_COMPLETED, LOCKER_OPEN_FAILED, etc.
- **Trigger on schedule**: Cron expressions
- **Evaluate conditions**: Booking status, time windows, etc.
- **Execute actions**: send_email, send_sms, create_ticket, update_booking_status

Example rule (seed data):
```json
{
  "name": "Send pickup instructions on payment",
  "triggerType": "EVENT",
  "triggerEvent": "PAYMENT_COMPLETED",
  "actions": [
    { "type": "send_email", "template": "pickup_instructions" },
    { "type": "send_sms", "template": "sms_pickup_ready" }
  ]
}
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Chat API
│   │   ├── events/route.ts     # Events webhook
│   │   ├── locker/route.ts     # Locker operations
│   │   └── admin/
│   │       ├── dashboard/      # Dashboard metrics
│   │       ├── tickets/        # Ticket management
│   │       └── actions/        # AI actions log
│   ├── admin/
│   │   ├── page.tsx           # Dashboard UI
│   │   ├── tickets/page.tsx   # Tickets UI
│   │   └── actions/page.tsx   # Actions UI
│   └── page.tsx               # Landing page
├── components/
│   └── chat/
│       └── ChatWidget.tsx     # Embeddable chat
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── ai/
│   │   ├── orchestrator.ts    # Message routing
│   │   ├── agents/            # Agent configs
│   │   └── tools/             # Tool implementations
│   ├── providers/
│   │   ├── email.ts           # Email sending
│   │   ├── sms.ts             # SMS sending
│   │   └── locker.ts          # Locker API
│   └── rules/
│       └── engine.ts          # Rules processing
└── worker/
    └── index.ts               # Background worker

prisma/
├── schema.prisma              # Database schema
└── seed.ts                    # Sample data
```

## License

MIT

---

Built with ❤️ for Rentbox.ee
