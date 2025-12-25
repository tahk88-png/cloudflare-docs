# Rentbox AI Employee v1.0

A comprehensive AI-powered customer support and automation system for Rentbox - a smart rental service using automated lockers.

## 🚀 Features

### 1. Customer Support Chat Widget
- **Context-Aware AI Assistant**: Identifies context via booking_id or logged-in session
- **Multi-Agent System**: Three specialized agents (Support, Operations, Sales)
- **Conversation Persistence**: All conversations stored in database
- **Tool Integration**: AI can get booking info, create tickets, send emails/SMS, and control lockers

### 2. Event-Driven Automation
- **Webhook Integration**: Receives and processes events from payment systems, lockers, etc.
- **Rules Engine**: Processes events and applies automation rules
- **Automated Messaging**: Pickup instructions, reminders, overdue notices
- **Smart Escalation**: Creates tickets for repeated failures or complex issues

### 3. Admin Console
- **Risk Dashboard**: Real-time view of overdue bookings, locker failures, pending payments
- **Ticket Management**: Complete ticket lifecycle management with priorities
- **AI Actions Log**: Searchable audit log of all AI actions
- **Metrics & Analytics**: Key performance indicators and statistics

## 🏗️ Architecture

### Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes + TypeScript
- **Database**: PostgreSQL with pg driver
- **AI**: OpenAI GPT-4 with function calling
- **Background Jobs**: node-cron for scheduled tasks
- **Integrations**: Email (SMTP/Nodemailer), SMS (Twilio), Locker APIs (HTTP/MQTT)

### Database Schema

```
users              - Customer information
products           - Rental items
lockers            - Physical locker locations
compartments       - Individual locker compartments
bookings           - Rental bookings with compartment assignment
payments           - Payment records
events             - Webhook events from external systems
messages           - Chat conversation history
ai_actions         - Audit log of all AI actions
tickets            - Support tickets
rate_limits        - Rate limiting for outbound messages
automation_rules   - Event-driven automation rules
message_templates  - Email and SMS templates
```

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+
- OpenAI API key

### Setup Steps

1. **Clone and Install Dependencies**
```bash
cd rentbox-ai
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rentbox_ai

# OpenAI API
OPENAI_API_KEY=sk-...

# Email Provider (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@rentbox.ee

# SMS Provider (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
MAX_EMAILS_PER_HOUR=10
MAX_SMS_PER_HOUR=5

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

3. **Initialize Database**
```bash
npm run db:migrate  # Create tables
npm run db:seed     # Load sample data
```

4. **Start the Application**

In separate terminals:

```bash
# Start Next.js development server
npm run dev

# Start background worker (in another terminal)
npm run worker
```

The application will be available at:
- Frontend: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin
- API: http://localhost:3000/api/*

## 🔧 Usage

### Customer-Facing Chat Widget

Add the chat widget to any page:

```tsx
import { ChatWidget } from '@/components/ChatWidget';

<ChatWidget 
  bookingId={123}      // Optional: booking context
  userId={456}         // Optional: user context
  conversationId="..." // Optional: existing conversation
/>
```

Access with URL parameters:
```
http://localhost:3000?booking_id=123&user_id=456
```

### Webhook Integration

Send events to the webhook endpoint:

```bash
POST /api/events/webhook
Content-Type: application/json

{
  "event_type": "payment.completed",
  "entity_type": "payment",
  "entity_id": 123,
  "payload": {
    "payment_id": 123,
    "booking_id": 456,
    "amount": 80.00
  }
}
```

Supported event types:
- `payment.completed` - Payment successful
- `locker.opened` - Locker opened successfully
- `locker.open_failed` - Locker failed to open
- `booking.created` - New booking created
- Custom events as needed

### AI Agent System

Three specialized agents handle different scenarios:

1. **Support Agent** (💬)
   - Customer questions and issues
   - Troubleshooting help
   - Booking information
   - General support

2. **Operations Agent** (⚙️)
   - Locker system issues
   - Failed operations
   - Overdue rentals
   - Physical interventions

3. **Sales Agent** (🎯)
   - Product recommendations
   - Pre-booking questions
   - Pricing inquiries
   - Conversion optimization

The system automatically routes conversations to the appropriate agent based on context.

### Automation Rules

The rules engine runs continuously in the background worker:

**Event-Based Rules:**
- Send pickup instructions when payment completes
- Create tickets on repeated locker failures
- Notify operations on critical events

**Time-Based Rules:**
- Send 2-hour return reminders
- Send overdue notices
- Check for pending payments

Configure rules in the `automation_rules` table.

### Safety Features

The system includes multiple safety mechanisms:

1. **No Financial Actions**: AI cannot issue refunds or modify payments
2. **Locker Access Control**: 
   - Only paid bookings
   - Within valid time window
   - Correct compartment matching
3. **Rate Limiting**: 
   - 10 emails per user per hour (configurable)
   - 5 SMS per user per hour (configurable)
4. **Audit Logging**: All AI actions logged with reason and outcome

## 🛠️ Development

### Project Structure

```
rentbox-ai/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── chat/             # Chat endpoints
│   │   ├── events/           # Webhook endpoints
│   │   └── admin/            # Admin API
│   ├── admin/                # Admin pages
│   │   ├── page.tsx          # Dashboard
│   │   ├── tickets/          # Ticket management
│   │   └── ai-actions/       # Actions log
│   └── page.tsx              # Customer-facing homepage
├── components/               # React components
│   └── ChatWidget.tsx        # Chat widget component
├── lib/                      # Core business logic
│   ├── ai/                   # AI system
│   │   ├── agents.ts         # Agent definitions
│   │   ├── orchestrator.ts   # AI orchestration
│   │   └── tools.ts          # Tool functions
│   ├── automation/           # Automation engine
│   │   └── rules-engine.ts   # Rules processing
│   ├── providers/            # External integrations
│   │   ├── email.ts          # Email provider
│   │   ├── sms.ts            # SMS provider
│   │   └── locker.ts         # Locker API
│   ├── repositories/         # Data access layer
│   │   ├── bookings.ts
│   │   ├── tickets.ts
│   │   ├── messages.ts
│   │   └── ...
│   ├── db.ts                 # Database client
│   └── types.ts              # TypeScript types
├── worker/                   # Background worker
│   └── index.ts              # Cron jobs
├── database/                 # Database files
│   ├── schema.sql            # Database schema
│   └── seed.sql              # Sample data
└── package.json

```

### Available Scripts

```bash
npm run dev        # Start Next.js dev server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run worker     # Start background worker
npm run db:migrate # Run database migrations
npm run db:seed    # Seed sample data
npm run db:reset   # Reset database (migrate + seed)
```

### API Endpoints

**Chat:**
- `POST /api/chat` - Send message to AI
- `GET /api/chat/history` - Get conversation history

**Events:**
- `POST /api/events/webhook` - Receive webhook events

**Admin:**
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/tickets` - List tickets
- `GET /api/admin/tickets/[id]` - Ticket details
- `PATCH /api/admin/tickets/[id]` - Update ticket
- `GET /api/admin/ai-actions` - List AI actions

## 🔐 Security Considerations

1. **Authentication**: Add authentication middleware for admin routes
2. **Webhook Verification**: Validate webhook signatures in production
3. **API Keys**: Store all sensitive keys in environment variables
4. **Rate Limiting**: Implement global API rate limiting
5. **Input Validation**: All inputs validated with Zod
6. **SQL Injection**: Using parameterized queries throughout
7. **CORS**: Configure CORS policies for production

## 🚀 Production Deployment

### Environment Setup

1. Set up PostgreSQL database
2. Configure all environment variables
3. Set up email provider (SMTP or transactional email service)
4. Set up SMS provider (Twilio or alternative)
5. Configure locker API credentials

### Deployment Steps

```bash
# Build the application
npm run build

# Start the production server
npm run start

# Start the worker process (separate process/container)
npm run worker
```

### Recommended Infrastructure

- **Application Server**: Vercel, AWS, or similar
- **Database**: Managed PostgreSQL (AWS RDS, Supabase, etc.)
- **Worker**: Separate container or serverless cron
- **Monitoring**: Application monitoring and logging
- **Backup**: Regular database backups

## 📊 Monitoring & Observability

The system provides multiple monitoring points:

1. **AI Actions Log**: Track all AI decisions and outcomes
2. **Event Processing**: Monitor event queue and processing
3. **Rate Limits**: Track API usage per user
4. **Ticket Metrics**: Support performance indicators
5. **Locker Health**: Track failure rates and interventions

## 🤝 Contributing

This is a production system. For changes:

1. Create feature branch
2. Test thoroughly with sample data
3. Update documentation
4. Submit for review

## 📝 License

Copyright © 2025 Rentbox. All rights reserved.

## 🆘 Support

For issues or questions:
- Check the AI Actions log in admin dashboard
- Review database events table for processing errors
- Check worker logs for automation issues
- Review rate limit tables if messages aren't sending

## 🎯 Roadmap

Future enhancements:
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Voice call support
- [ ] Predictive maintenance for lockers
- [ ] Customer sentiment analysis
- [ ] A/B testing for automation rules

---

**Built with ❤️ for Rentbox**
