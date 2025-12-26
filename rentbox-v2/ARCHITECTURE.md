# Rentbox v2 — Production Architecture

## System Overview

Rentbox v2 is a 24/7 self-service tool rental platform with physical locker integration.
The system operates unattended and must be predictable, auditable, and scalable.

**Core Principle**: Server + database are the source of truth. Always.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | SSR for SEO + hydrated SPA |
| UI | Tailwind CSS + shadcn/ui | Consistent, accessible components |
| Backend | NestJS (Node.js) | Modular, typed API services |
| Database | PostgreSQL 15 | Primary data store, ACID compliance |
| Cache/Locks | Redis 7 | Distributed locks, TTL caching |
| Queue | BullMQ | Background jobs, retries |
| Object Storage | Cloudflare R2 / S3 | Media files |
| Deployment | Vercel (frontend) + Railway/Fly.io (backend) | Global edge + stable compute |

---

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  Public Pages    │  Customer Dashboard  │  Admin Dashboard       │
│  - Catalog       │  - My Rentals        │  - Bookings            │
│  - Product       │  - Calendar          │  - Lockers             │
│  - Checkout      │  - Invoices          │  - Incidents           │
│  - Location      │  - Profile           │  - Users               │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
│  - Rate Limiting  - Auth (JWT + Sessions)  - Request Logging    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                       BACKEND SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   CONTENT    │  │   CATALOG    │  │   BOOKING    │           │
│  │   ENGINE     │  │   SERVICE    │  │   ENGINE     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   CALENDAR   │  │   CHECKOUT   │  │   LOCKER     │           │
│  │   SERVICE    │  │   + SIGNING  │  │   SERVICE    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   RETURN     │  │ NOTIFICATION │  │   INCIDENT   │           │
│  │   SERVICE    │  │   ENGINE     │  │   SERVICE    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │    RBAC      │  │     SEO      │                             │
│  │   SERVICE    │  │   SERVICE    │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PostgreSQL  │  │    Redis     │  │   BullMQ     │           │
│  │  (Primary)   │  │  (Cache/Lock)│  │   (Jobs)     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Payment    │  │    Locker    │  │     SMS      │           │
│  │   Gateway    │  │   Hardware   │  │   Provider   │           │
│  │   (Stripe)   │  │  (MQTT/HTTP) │  │  (Twilio)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Email     │  │   Smart-ID   │  │   Object     │           │
│  │   (Resend)   │  │  Mobiil-ID   │  │   Storage    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Invariants

These rules are enforced at the database level and cannot be violated:

### 1. No Double Bookings
```sql
-- Exclusion constraint on compartment bookings
EXCLUDE USING gist (
  compartment_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status NOT IN ('cancelled', 'expired'))
```

### 2. Time is Absolute
- All timestamps stored as `TIMESTAMPTZ`
- Rendered in `Europe/Tallinn` timezone
- DST transitions handled correctly
- Server time is authoritative

### 3. Audit Everything
- Every state change creates an audit log entry
- Audit logs are append-only
- Hardware events are logged with microsecond precision

### 4. Idempotency
- All write endpoints accept `Idempotency-Key` header
- Retries are safe for 24 hours
- Payment callbacks are deduplicated

---

## Module Specifications

### Module 1: Content Creation Engine

**Purpose**: Create and manage marketing content for tools, emails, and landing pages.

**Components**:
- Block-based editor (Slate.js / TipTap)
- AI text improvement service (clarity, grammar, tone)
- Media processor (image optimization, video transcoding)
- Multi-channel preview (web, email, mobile)
- Version control with diff view

**AI Rules**:
- AI suggests, never auto-applies
- Original meaning must be preserved
- No spam language, urgency tactics, or fake scarcity
- User sees before/after comparison
- One-click revert always available

---

### Module 2: Product & Catalog System

**Purpose**: Manage tool inventory, pricing, and SEO-optimized product pages.

**Features**:
- Hierarchical categories
- Multi-image galleries
- Pricing tiers (hourly, daily, weekly)
- Deposit requirements
- Maintenance schedules
- Location-aware availability
- Schema.org markup generation

**Data Model**:
```
Product → has_many → ProductVariants
Product → has_many → ProductImages
Product → belongs_to → Category
ProductVariant → has_many → CompartmentAssignments
```

---

### Module 3: Booking Engine (Time-Based)

**Purpose**: Handle reservations with guaranteed non-overlap.

**Booking Lifecycle**:
```
┌─────────┐    payment    ┌──────┐    start_time    ┌────────┐
│ PENDING │──────────────▶│ PAID │─────────────────▶│ ACTIVE │
└─────────┘               └──────┘                  └────────┘
     │                                                   │
     │ TTL expired                              end_time │
     ▼                                                   ▼
┌─────────┐                                      ┌───────────┐
│ EXPIRED │                                      │ COMPLETED │
└─────────┘                                      └───────────┘
                                                       │
                                           not returned│
                                                       ▼
                                                 ┌─────────┐
                                                 │ OVERDUE │
                                                 └─────────┘
```

**Critical Rules**:
- Pending bookings hold slot for 15 minutes (configurable TTL)
- Extension requests require availability check
- Overdue detection runs every minute
- Late fees calculated per minute after grace period

---

### Module 4: Calendar System

**Customer View**:
- Slot-based availability picker
- Duration selector (1h, 4h, 24h, 7d)
- "Next available" quick action
- Real-time availability updates

**Admin View**:
- Timeline view: Locker → Compartments → Time
- Drag-to-create maintenance blocks
- Color-coded booking status
- Conflict visualization
- ICS export (read-only subscription)

---

### Module 5: User Dashboard ("Minu Rendid")

**Sections**:
1. **Active Rentals**: Countdown timer, access code, extend/return actions
2. **Upcoming**: Reminder settings, cancel option (if policy allows)
3. **Past Rentals**: History, invoices, "rent again" action
4. **Documents**: Signed agreements, receipts
5. **Profile**: Contact info, preferences, saved payment methods

---

### Module 6: Checkout & Digital Signing

**Flow**:
```
Cart Review → Terms Acceptance → Signature → Payment → Confirmation
```

**Signature Requirements**:

| Condition | Required Method |
|-----------|-----------------|
| Default | Typed signature (name) |
| Amount > €200 | Smart-ID / Mobiil-ID |
| Duration > 7 days | Smart-ID / Mobiil-ID |
| B2B customer | Smart-ID / ID-card |

**Contract Integrity**:
- SHA-256 hash of contract terms stored
- Timestamp from trusted source
- Signer identity verified
- Contract immutable after signing

---

### Module 7: Locker Access Service

**Operations**:
```
OPEN_COMPARTMENT(booking_id) → { success: boolean, event_id: string }
CLOSE_COMPARTMENT(compartment_id) → { success: boolean, event_id: string }
STATUS(locker_id) → { compartments: [{ id, is_open, last_event }] }
```

**Access Rules**:
- Access ONLY if booking status = ACTIVE
- Time window: start_at - 15min to end_at + 30min (grace)
- Max 3 open attempts per booking
- Fallback: SMS PIN code after 2 failures

**Event Logging**:
```json
{
  "event_id": "evt_abc123",
  "locker_id": "L001",
  "compartment_id": "L001-C03",
  "action": "OPEN",
  "success": true,
  "booking_id": "bkg_xyz789",
  "user_id": "usr_456",
  "timestamp": "2024-01-15T14:30:00.123456Z",
  "hardware_response_ms": 234,
  "method": "APP"
}
```

---

### Module 8: Return Flow

**Steps**:
1. User initiates return (app or physical button)
2. Compartment unlocks
3. User places item, closes door
4. Optional: User uploads condition photo
5. System detects door close
6. Auto-complete if within time, else mark for review
7. Admin verification for flagged returns

**Overdue Handling**:
- Grace period: 30 minutes (configurable)
- After grace: Late fee accrues per minute
- After 24h: Escalate to incident
- After 72h: Contact emergency contact, potential legal action

---

### Module 9: Notification Engine

**Channels**:
- Email (transactional via Resend/SendGrid)
- SMS (critical only, via Twilio)
- Push (PWA notifications)

**Event Triggers**:

| Event | Email | SMS | Push |
|-------|-------|-----|------|
| Booking confirmed | ✓ | | ✓ |
| Payment received | ✓ | | |
| Rental starting (1h before) | ✓ | ✓ | ✓ |
| Return reminder (30m before) | ✓ | ✓ | ✓ |
| Overdue warning | ✓ | ✓ | ✓ |
| Return confirmed | ✓ | | ✓ |
| Late fee charged | ✓ | ✓ | |

**Delivery Guarantees**:
- Retry 3x with exponential backoff
- Log all delivery attempts
- Track open/click for transactional emails
- SMS delivery receipts stored

---

### Module 10: Incident Management

**Incident Types**:
- `LOCKER_MALFUNCTION` - Hardware failure
- `PAYMENT_ACCESS_MISMATCH` - Paid but can't access
- `TOOL_DAMAGED` - Returned in poor condition
- `TOOL_MISSING` - Not returned
- `USER_DISPUTE` - Customer complaint
- `SYSTEM_ERROR` - Software failure

**Severity Levels**:
- `P1` - Customer blocked, immediate response
- `P2` - Service degraded, 1-hour response
- `P3` - Minor issue, 24-hour response
- `P4` - Tracking only, no SLA

**Resolution Workflow**:
```
OPEN → INVESTIGATING → PENDING_ACTION → RESOLVED
              │
              └──────────► ESCALATED
```

**Data Retention**: Incidents are NEVER deleted. Soft-delete with `archived_at`.

---

### Module 11: RBAC (Roles & Permissions)

**Roles**:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `ADMIN` | Full system access | All operations, user management, billing |
| `OPERATOR` | Daily operations | Bookings, incidents, basic locker ops |
| `TECHNICIAN` | Hardware maintenance | Locker status, maintenance mode, diagnostics |
| `CUSTOMER` | End user | Own bookings, profile, support requests |

**Permission Model**:
```
Role → has_many → Permissions
User → has_one → Role
User → has_many → PermissionOverrides (for edge cases)
```

**Audit**:
- All role changes logged with before/after
- Permission checks logged for sensitive operations
- UI hides unauthorized actions (but server still validates)

---

### Module 12: SEO & Conversion Layer

**Programmatic Pages**:
- `/rent/{tool-slug}` - Product pages
- `/rent/{tool-slug}/{city}` - Location-specific
- `/rent/{category}/{city}` - Category landing
- `/compare/rent-vs-buy/{tool}` - Calculator pages

**Schema.org Markup**:
- `Product` with `offers`
- `LocalBusiness` with `areaServed`
- `FAQPage` for common questions
- `AggregateRating` (when reviews exist)

**Rent vs Buy Calculator**:
- Input: Usage frequency, purchase price, tool lifespan
- Output: Break-even analysis, recommendation
- No dark patterns, honest math

---

## Data Consistency

### Timestamp Handling

```typescript
// All times stored in UTC
const booking = await prisma.booking.create({
  data: {
    start_at: new Date(startAtUTC), // Always UTC
    end_at: new Date(endAtUTC),
    timezone: 'Europe/Tallinn' // User's display timezone
  }
});

// Rendering in user's timezone
import { formatInTimeZone } from 'date-fns-tz';
const displayTime = formatInTimeZone(
  booking.start_at,
  booking.timezone,
  'dd.MM.yyyy HH:mm'
);
```

### Idempotency Implementation

```typescript
// Middleware for idempotent operations
async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return next();
  
  const cached = await redis.get(`idempotency:${key}`);
  if (cached) {
    const { status, body } = JSON.parse(cached);
    return res.status(status).json(body);
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    redis.setex(
      `idempotency:${key}`,
      86400, // 24 hours
      JSON.stringify({ status: res.statusCode, body })
    );
    originalSend.call(this, body);
  };
  
  next();
}
```

---

## Error Handling Philosophy

### User-Facing Errors

```typescript
// Good: Plain language, next step clear
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot was just booked by another customer.",
    "action": "Please select a different time.",
    "alternatives": [
      { "start_at": "2024-01-15T16:00:00Z", "end_at": "2024-01-15T20:00:00Z" }
    ]
  }
}

// Bad: Technical jargon, no guidance
{
  "error": "CONFLICT_EXCEPTION: Row lock acquisition failed"
}
```

### Admin-Facing Errors

```typescript
// Full context for debugging
{
  "error": {
    "code": "LOCKER_TIMEOUT",
    "message": "Compartment L001-C03 did not respond within 5000ms",
    "context": {
      "locker_id": "L001",
      "compartment_id": "L001-C03",
      "booking_id": "bkg_xyz789",
      "attempt": 2,
      "last_successful_ping": "2024-01-15T14:25:00Z"
    },
    "suggested_actions": [
      "Check locker network connectivity",
      "Verify compartment servo status",
      "Issue manual override PIN"
    ]
  }
}
```

---

## What The System Must NEVER Do

1. **Guess availability** - Only show confirmed, database-verified slots
2. **Auto-book** - User must explicitly confirm every booking
3. **Auto-pay** - Payment requires explicit user action
4. **Hide conflicts** - Always surface booking collisions
5. **Change user intent** - No dark patterns, no "recommended" upsells
6. **Optimize persuasion over truth** - Accuracy beats conversion
7. **Silent failures** - Every error is logged and surfaced appropriately
8. **Delete audit logs** - Historical record is permanent

---

## Deployment Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (DNS + CDN)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼──────────┐
    │      Vercel       │       │     Railway/Fly     │
    │    (Frontend)     │       │     (Backend)       │
    │                   │       │                     │
    │  - Next.js SSR    │       │  - NestJS API       │
    │  - Static assets  │       │  - Background jobs  │
    │  - Edge functions │       │  - WebSocket server │
    └───────────────────┘       └──────────┬──────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
          ┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼────────┐
          │   PostgreSQL      │  │      Redis        │  │  Cloudflare R2  │
          │   (Neon/Supabase) │  │   (Upstash)       │  │  (Object Store) │
          └───────────────────┘  └───────────────────┘  └─────────────────┘
```

---

## Monitoring & Observability

- **Application Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Logs**: Structured JSON → Logtail/Axiom
- **Uptime**: Checkly synthetic monitors
- **Alerting**: PagerDuty for P1 incidents

---

## Security Measures

1. **Authentication**: JWT with short expiry + refresh tokens
2. **Authorization**: RBAC with per-request validation
3. **Data**: AES-256 encryption at rest, TLS 1.3 in transit
4. **Secrets**: Environment variables via platform secrets manager
5. **Input Validation**: Zod schemas on all endpoints
6. **Rate Limiting**: Per-IP and per-user limits
7. **CSRF**: Double-submit cookie pattern
8. **SQL Injection**: Parameterized queries only (Prisma)

---

## Disaster Recovery

- **Database**: Point-in-time recovery, 7-day retention
- **Backups**: Daily snapshots to separate region
- **Failover**: Multi-AZ database deployment
- **Incident Response**: Documented runbooks for common failures
- **Data Export**: Customer data export within 48 hours (GDPR)
