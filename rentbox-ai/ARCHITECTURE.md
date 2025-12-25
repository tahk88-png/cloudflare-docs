# Rentbox AI Employee - Architecture Documentation

## System Overview

Rentbox AI Employee is a production-grade AI-powered customer support and automation platform designed for smart rental services. The system uses a multi-agent architecture with specialized AI agents, event-driven automation, and comprehensive safety mechanisms.

## Core Components

### 1. AI Orchestrator (`lib/ai/orchestrator.ts`)

The orchestrator manages all AI interactions and routes conversations to appropriate agents.

**Key Features:**
- OpenAI GPT-4 Turbo integration with function calling
- Conversation history management
- Tool execution coordination
- Context-aware agent routing

**Flow:**
```
User Message → Orchestrator → Agent Selection → Tool Calls → Response → Database
```

### 2. Multi-Agent System (`lib/ai/agents.ts`)

Three specialized agents handle different customer needs:

**Support Agent (💬)**
- Purpose: General customer support and troubleshooting
- Triggers: Help, questions, booking inquiries
- Tools: get_booking, create_ticket, send_email/sms
- Style: Friendly, empathetic, clear instructions

**Operations Agent (⚙️)**
- Purpose: Technical issues, locker management, logistics
- Triggers: Locker malfunctions, overdue items, system errors
- Tools: All tools + locker control
- Style: Efficient, technical, solution-focused

**Sales Agent (🎯)**
- Purpose: Product recommendations, conversions, pre-booking
- Triggers: Product questions, pricing, availability
- Tools: get_booking, send_email/sms
- Style: Enthusiastic, value-focused, persuasive

**Agent Routing Algorithm:**
```typescript
function routeToAgent(message: string, context: any): AgentType {
  if (hasOpsKeywords(message)) return 'ops';        // Highest priority
  if (hasSalesKeywords(message) && !context.booking_id) return 'sales';
  return 'support';                                  // Default
}
```

### 3. Tool System (`lib/ai/tools.ts`)

AI agents have access to 6 core tools:

#### get_booking
```typescript
// Retrieves complete booking information
{
  booking: BookingWithDetails,
  payments: Payment[],
  is_fully_paid: boolean,
  time_until_start: string,
  is_overdue: boolean
}
```

#### create_ticket
```typescript
// Creates support ticket
{
  booking_id?: number,
  user_id: number,
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  category: string
}
```

#### send_email / send_sms
```typescript
// Sends templated message with rate limiting
{
  user_id: number,
  template_name: string,
  variables: Record<string, any>
}
```

#### open_locker
```typescript
// Opens locker compartment (with safety checks)
{
  booking_id: number
}
```

#### log_ai_action
```typescript
// Audit logging
{
  action_type: string,
  reason: string,
  outcome: 'success' | 'failed' | 'skipped'
}
```

### 4. Rules Engine (`lib/automation/rules-engine.ts`)

Event-driven and time-based automation system.

**Event Processing Flow:**
```
Webhook → events table → Rules Engine → Actions → ai_actions log
```

**Rule Structure:**
```typescript
{
  trigger_type: 'event' | 'time_based',
  trigger_config: { event_type: string } | { schedule: string },
  conditions: { field: value },
  actions: ['send_email:template', 'create_ticket:priority']
}
```

**Processing Cycles:**
- Events: Every 1 minute
- Time-based rules: Every 15 minutes

### 5. Safety System (`lib/ai/tools.ts` - SafetyValidator)

Multi-layer safety checks prevent unauthorized or dangerous actions.

**Locker Access Safety:**
```typescript
canOpenLocker(bookingId):
  ✓ Booking exists
  ✓ Booking is fully paid
  ✓ Within allowed time window (1h before start → end time)
  ✓ Booking status is valid (confirmed/active/overdue)
  ✓ Compartment information exists
  → Allow or Deny with reason
```

**Financial Safety:**
- Refunds: Permanently blocked (requires human)
- Payment modifications: Permanently blocked (requires human)

**Rate Limiting:**
- Email: 10 per user per hour (sliding window)
- SMS: 5 per user per hour (sliding window)
- Implemented at provider level with database tracking

### 6. Communication Providers

#### Email Provider (`lib/providers/email.ts`)
```typescript
RateLimitedEmailProvider
  → Check rate limit (query last hour)
  → Send via Nodemailer/SMTP
  → Increment counter
  → Log to ai_actions
```

#### SMS Provider (`lib/providers/sms.ts`)
```typescript
RateLimitedSMSProvider
  → Check rate limit
  → Send via Twilio API (or mock)
  → Increment counter
  → Log to ai_actions
```

### 7. Locker Abstraction (`lib/providers/locker.ts`)

Supports multiple locker systems via adapters.

**HTTP Adapter:**
```typescript
POST {api_endpoint}/open
Authorization: Bearer {api_key}
Body: { compartment_number, action, code }
```

**MQTT Adapter:**
```typescript
Topic: {locker.mqtt_topic}/command
Message: { compartment, action, code, timestamp }
Response: {locker.mqtt_topic}/response
```

## Data Flow Diagrams

### Customer Support Chat Flow

```
User Opens Chat
    ↓
Load Conversation History
    ↓
User Sends Message → Save to messages table
    ↓
Determine Context (booking_id, user_id)
    ↓
Route to Agent (support/ops/sales)
    ↓
AI Orchestrator calls OpenAI
    ↓
AI decides to use tools? → Execute tools
    ↓                         ↓
Continue conversation    Log to ai_actions
    ↓
Return Response → Save to messages table
    ↓
Display to User
```

### Event Processing Flow

```
External System (Payment/Locker)
    ↓
POST /api/events/webhook
    ↓
Create event in events table (processed=false)
    ↓
Background Worker (every 1 min)
    ↓
Query unprocessed events
    ↓
For each event:
    ↓
  Find matching automation rules
    ↓
  Evaluate conditions
    ↓
  Execute actions (email, SMS, ticket)
    ↓
  Mark event as processed
    ↓
  Log to ai_actions
```

### Time-Based Automation Flow

```
Background Worker (every 15 min)
    ↓
Query time-based automation rules
    ↓
For each rule:
    ↓
  Check schedule (2h before end, overdue, etc.)
    ↓
  Query relevant bookings
    ↓
  For each booking:
      ↓
    Check if action already taken (ai_actions)
      ↓
    Execute actions (reminder email, etc.)
      ↓
    Log to ai_actions
```

## Database Architecture

### Key Relationships

```
users ←─── bookings ─→ products
           ↓
       compartments ─→ lockers
           ↓
        payments
           ↓
        events
           ↓
        messages
           ↓
        ai_actions
           ↓
        tickets
```

### Important Indexes

```sql
-- Event processing
idx_events_type_processed ON events(event_type, processed)
idx_events_created_at ON events(created_at)

-- Message retrieval
idx_messages_conversation ON messages(conversation_id, created_at)
idx_messages_booking ON messages(booking_id)

-- AI actions analytics
idx_ai_actions_type ON ai_actions(action_type, created_at)
idx_ai_actions_booking ON ai_actions(booking_id)

-- Ticket management
idx_tickets_status ON tickets(status, priority)

-- Rate limiting
idx_rate_limits_user ON rate_limits(user_id, message_type, window_start)
```

## API Design

### RESTful Endpoints

```
POST   /api/chat                    - Send chat message
GET    /api/chat/history            - Get conversation history
POST   /api/events/webhook          - Receive event webhook

GET    /api/admin/dashboard         - Dashboard metrics & risks
GET    /api/admin/tickets           - List tickets (with filters)
GET    /api/admin/tickets/[id]      - Get ticket details
PATCH  /api/admin/tickets/[id]      - Update ticket
GET    /api/admin/ai-actions        - List AI actions (with filters)
```

### Request/Response Formats

**Chat Request:**
```json
{
  "message": "Can you help me with my booking?",
  "conversation_id": "conv_1234",
  "booking_id": 123,
  "user_id": 456
}
```

**Chat Response:**
```json
{
  "success": true,
  "response": "I'd be happy to help! Let me check your booking details...",
  "agent_type": "support",
  "tool_calls": [
    {
      "name": "get_booking",
      "arguments": { "booking_id": 123 },
      "result": { ... }
    }
  ]
}
```

## Performance Considerations

### Database Optimization
- Connection pooling (max 20 connections)
- Indexed foreign keys and frequent queries
- Slow query logging (>1s)
- Prepared statements for all queries

### API Performance
- Streaming responses for chat (future enhancement)
- Pagination for list endpoints
- Caching for dashboard metrics (30s TTL)
- Background processing for heavy operations

### Scalability
- Stateless API design (horizontal scaling)
- Worker processes can run multiple instances
- Database read replicas for analytics
- Event queue for high-volume webhooks

## Security Architecture

### Input Validation
- Zod schemas for all API inputs
- SQL parameterized queries (no string interpolation)
- Content Security Policy headers

### Authentication (To Implement)
```typescript
// Recommended middleware
middleware: [
  '/api/admin/*',  // Admin routes
  '/api/chat'      // User routes (session/JWT)
]
```

### Data Protection
- Environment variables for secrets
- No sensitive data in logs
- Audit trail for all AI actions
- Rate limiting on all endpoints

## Monitoring & Observability

### Key Metrics

**Application Metrics:**
- Chat response time
- Tool execution success rate
- Event processing latency
- Rule execution count

**Business Metrics:**
- Tickets created per day
- AI resolution rate
- Customer satisfaction (via chat)
- Automation effectiveness

**System Metrics:**
- API error rate
- Database connection pool utilization
- Worker health checks
- Rate limit hits

### Logging Strategy

```typescript
// Structured logging
{
  timestamp: ISO8601,
  level: 'info' | 'warn' | 'error',
  component: 'orchestrator' | 'rules-engine' | 'api',
  action: 'tool_execution' | 'event_processing',
  details: { ... },
  user_id?: number,
  booking_id?: number
}
```

## Testing Strategy

### Unit Tests (Recommended)
- Tool execution functions
- Safety validators
- Template rendering
- Rate limit calculations

### Integration Tests (Recommended)
- API endpoint flows
- Database operations
- Event processing pipeline
- AI agent responses (with mock OpenAI)

### End-to-End Tests (Recommended)
- Complete chat conversation
- Webhook → automation → action
- Admin dashboard workflows

## Deployment Architecture

### Production Setup

```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ App 1 │ │ App 2 │  (Next.js instances)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
    ┌────▼─────────┐
    │  PostgreSQL  │
    │   (Primary)  │
    └──────────────┘
         │
    ┌────▼─────────┐
    │  Worker(s)   │  (Background jobs)
    └──────────────┘
```

### Recommended Services

- **App Hosting**: Vercel, AWS ECS, or Kubernetes
- **Database**: AWS RDS, Google Cloud SQL, or Supabase
- **Worker**: AWS ECS, Google Cloud Run, or separate container
- **Monitoring**: DataDog, New Relic, or Grafana
- **Logging**: CloudWatch, LogDNA, or Papertrail

## Future Enhancements

### Phase 2 Features
- Streaming chat responses (Server-Sent Events)
- Voice call integration
- Multi-language support (i18n)
- Advanced analytics dashboard
- Customer satisfaction surveys

### Phase 3 Features
- Predictive maintenance for lockers
- Sentiment analysis for conversations
- A/B testing framework for automation
- Mobile app with push notifications
- GraphQL API option

---

This architecture is designed to be **production-ready**, **scalable**, and **maintainable** while providing excellent customer experience through AI automation.
