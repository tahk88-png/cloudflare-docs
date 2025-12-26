# Rentbox v2 - Production Architecture

**A 24/7 Self-Service Tool Rental Platform with Physical Locker Integration**

## Mission Statement

Rentbox v2 operates as a self-sufficient, auditable, and trustworthy rental system that does not rely on human babysitting. If something goes wrong, the system remembers more than people do.

## Core Principles (Non-Negotiable)

1. **Availability is time-based, not stock-based**
   - Tools are available in time slots, not inventory counts
   - No double bookings under any condition

2. **Server + Database are the source of truth**
   - Client state is ephemeral
   - All critical decisions happen server-side

3. **Physical access is logged and auditable**
   - Every locker interaction is recorded
   - Full audit trail for disputes

4. **Users stay in control; AI assists only**
   - AI suggests, never overwrites
   - User intent is sacred

5. **System must work unattended 24/7**
   - Predictable, auditable, scalable
   - No silent failures

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router, SSR for SEO)
- **Styling**: Tailwind CSS 3.x
- **Components**: shadcn/ui
- **State**: React Query + Zustand
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 15+ (timestamptz everywhere)
- **Cache/Locks**: Redis 7.x
- **Queue**: BullMQ
- **Real-time**: WebSockets (Socket.io)

### Infrastructure
- **Hosting**: Vercel (frontend) + Cloudflare Workers (edge)
- **Database**: Managed PostgreSQL (Supabase/Neon)
- **Object Storage**: Cloudflare R2 / AWS S3
- **CDN**: Cloudflare
- **Email**: Resend / SendGrid
- **SMS**: Twilio / Vonage
- **Monitoring**: Grafana + Prometheus + Sentry

### Hardware Integration
- **Protocol**: MQTT (primary) + HTTP (fallback)
- **Broker**: Mosquitto / AWS IoT Core
- **Locker API**: Vendor-specific REST API

## System Modules

### 1. Content Creation Engine
AI-assisted content editor for marketing materials, product descriptions, and communications.

**Features**:
- Block-based editor (text, image, video, CTA)
- AI text improvement (clarity, tone, grammar)
- Multi-channel preview (web, email, mobile)
- Version history

**Rules**:
- AI suggests, never auto-applies
- Preserve user meaning
- No marketing fluff

### 2. Product & Catalog System
Tool inventory with pricing, descriptions, and location-aware availability.

**Features**:
- Hourly/daily pricing with deposits
- SEO-optimized product pages
- Category & tag management
- Multi-location support

### 3. Booking Engine (Time-Based)
Core rental logic with strict temporal constraints.

**Features**:
- `start_at` → `end_at` bookings
- Compartment-level locking
- Status lifecycle: pending → paid → active → completed
- Extension & early return logic
- Overdue detection + auto-fees

**Guarantees**:
- Database-enforced uniqueness constraints
- Redis-based optimistic locking
- Idempotent booking creation

### 4. Calendar System
Availability visualization and slot selection.

**Customer Features**:
- Slot-based picker with duration selector
- "Next available" smart search
- Price calculation preview

**Admin Features**:
- Timeline view (locker → compartment → booking)
- Maintenance blocking
- Status-colored events
- ICS export (read-only)

### 5. User Dashboard ("Minu Rendid")
Self-service portal for customers.

**Features**:
- Active/upcoming/past rentals
- Real-time countdown timers
- Invoice & payment history
- Signed agreements
- One-click "Rent again"

### 6. Checkout + Digital Signing
Explicit consent and legally binding agreements.

**Features**:
- Rental terms acceptance (checkbox + signature)
- E-signature methods:
  - Typed signature (default)
  - Smart-ID (high-value)
  - Mobile-ID (high-value)
  - ID-card (B2B)
- Auto-escalation rules based on:
  - Rental amount (>€500)
  - Duration (>7 days)
  - Customer type (B2B)
- Immutable contract hash (SHA-256)

**Guarantees**:
- Payment blocked until signature valid
- Contract stored with timestamp + signature
- Audit trail for all signing events

### 7. Locker Access Service
Physical hardware integration with fault tolerance.

**Features**:
- Open/close compartment via MQTT/HTTP
- Retry logic (3 attempts, exponential backoff)
- Timeout handling (30s max)
- Fallback: PIN via SMS
- Full event logging

**Rules**:
- Access only if booking status = 'active'
- Hardware failures logged as incidents
- Never hide booking truth

### 8. Return Flow
End-of-rental process with verification.

**Features**:
- User-initiated return confirmation
- Optional photo upload (condition proof)
- Auto-overdue detection
- Admin verification workflow
- Dispute management

**Guarantees**:
- Immutable return timestamp
- Photo metadata preserved
- Audit trail for disputes

### 9. Notification Engine
Transactional communication system.

**Channels**:
- Email (all events)
- SMS (critical only)

**Events**:
- Booking confirmed
- Rental start reminder (1h before)
- Return reminder (2h before end)
- Overdue warning (+15min, +1h, +4h)
- Return confirmation

**Rules**:
- Transactional > marketing
- Retry with exponential backoff
- Delivery status tracking
- Unsubscribe honored (except critical)

### 10. Incident Management
Operational issue tracking and resolution.

**Types**:
- Hardware failure (locker)
- Payment mismatch
- Tool damage
- Customer dispute

**Features**:
- Severity levels (P0-P3)
- Linked entities (booking, locker, user)
- Resolution workflow
- SLA tracking
- Never deleted (soft delete only)

### 11. RBAC (Roles & Permissions)
Least-privilege access control.

**Roles**:
- **Admin**: Full system access
- **Operator**: Bookings, incidents, basic config
- **Technician**: Hardware access, maintenance blocks
- **Customer**: Self-service only

**Rules**:
- All role changes logged
- UI hides unauthorized actions
- API returns 403 for unauthorized attempts
- No role escalation without admin approval

### 12. SEO & Conversion Layer
Programmatic content for organic growth.

**Features**:
- Tool × location × use case pages
- Schema.org markup (Product, LocalBusiness, FAQ)
- Rent vs Buy calculator
- Local trust signals (reviews, nearby, hours)

## Data Principles

### Timezone Handling
- All times stored as `timestamptz` in PostgreSQL
- Server timezone: `Europe/Tallinn`
- DST-safe calculations
- Client receives ISO 8601 strings
- UI renders in user's local timezone

### Consistency Guarantees
- **ACID transactions** for critical operations
- **Optimistic locking** for high-contention resources
- **Idempotent endpoints** for booking, payment, access
- **Retry-safe operations** with idempotency keys

### Audit Logging
Every critical action logged with:
- `user_id` (who)
- `resource_id` + `resource_type` (what)
- `action` (created, updated, deleted, accessed)
- `timestamp` (when)
- `metadata` (JSONB payload)
- `ip_address` + `user_agent`

## Error Handling Philosophy

### User-Facing Errors
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "This time slot is already booked.",
    "action": "Please select a different time or try the next available slot.",
    "next_available": "2024-12-27T10:00:00Z"
  }
}
```

### Admin-Facing Errors
```json
{
  "error": {
    "code": "LOCKER_COMM_TIMEOUT",
    "message": "Failed to communicate with locker L-001-C-05",
    "details": {
      "locker_id": "L-001",
      "compartment_id": "C-05",
      "attempts": 3,
      "last_error": "ETIMEDOUT",
      "mqtt_status": "disconnected"
    },
    "action": "Check locker connectivity and retry. If issue persists, use fallback PIN access.",
    "incident_id": "INC-2024-001234"
  }
}
```

### Principles
- Plain language, no tech jargon
- Always show next step
- No silent failures
- Admins see full technical details

## What This System Must Never Do

1. ❌ Guess availability (always query source of truth)
2. ❌ Auto-book or auto-pay (user consent required)
3. ❌ Hide conflicts (surface all errors)
4. ❌ Change user intent (AI suggests only)
5. ❌ Optimize persuasion over truth (no dark patterns)
6. ❌ Delete audit logs (soft delete only)
7. ❌ Allow double bookings (DB constraints prevent)
8. ❌ Grant access without valid booking (status checks)

## Directory Structure

```
rentbox-v2/
├── README.md                          # This file
├── architecture/
│   ├── system-overview.md            # High-level architecture
│   ├── modules.md                    # Module interactions
│   ├── data-flow.md                  # Request/response flows
│   └── deployment.md                 # Infrastructure setup
├── database/
│   ├── schema.sql                    # Complete PostgreSQL schema
│   ├── constraints.md                # Business rule constraints
│   ├── indexes.md                    # Performance indexes
│   └── migrations/                   # Migration scripts
├── api/
│   ├── contracts.md                  # API specifications
│   ├── endpoints.md                  # REST endpoint catalog
│   ├── webhooks.md                   # Webhook definitions
│   └── examples/                     # Request/response examples
├── frontend/
│   ├── components.md                 # Component architecture
│   ├── pages.md                      # Page structure
│   ├── state-management.md           # State architecture
│   └── design-system.md              # UI/UX guidelines
├── state-machines/
│   ├── booking-lifecycle.md          # Booking state transitions
│   ├── return-flow.md                # Return process states
│   ├── incident-lifecycle.md         # Incident resolution
│   └── payment-flow.md               # Payment states
├── operations/
│   ├── monitoring.md                 # Metrics & alerts
│   ├── incident-response.md          # Runbook procedures
│   ├── audit-logs.md                 # Logging specifications
│   └── backup-recovery.md            # DR procedures
├── security/
│   ├── rbac.md                       # Role-based access control
│   ├── authentication.md             # Auth flows
│   ├── signing.md                    # Digital signature specs
│   └── threat-model.md               # Security considerations
└── examples/
    ├── booking-flow.json             # Complete booking example
    ├── return-flow.json              # Return process example
    └── incident-flow.json            # Incident handling example
```

## Getting Started

1. **Read Architecture**: Start with `architecture/system-overview.md`
2. **Review Database**: Understand `database/schema.sql` and constraints
3. **Explore API**: Check `api/contracts.md` for endpoint specifications
4. **Study State Machines**: Review `state-machines/booking-lifecycle.md`
5. **Implementation**: Use examples in `examples/` as reference

## Success Metrics

- **Availability**: 99.9% uptime (43.2 min/month downtime)
- **Booking Success Rate**: >95% (excluding user-cancelled)
- **Locker Access Success**: >99% (first attempt)
- **Payment Success**: >98% (excluding declined cards)
- **Response Time**: <500ms p95 for critical endpoints
- **Incident Resolution**: P0 <1h, P1 <4h, P2 <24h, P3 <7d

## Support & Escalation

**P0 - Critical (System Down)**
- Booking creation fails
- Locker access broken
- Payment processing down
- Response: Immediate (on-call paged)

**P1 - High (Degraded Service)**
- Notification delays
- Admin UI errors
- Single locker offline
- Response: <1 hour

**P2 - Medium (Feature Broken)**
- Calendar display issues
- Report generation fails
- Non-critical integrations down
- Response: <4 hours

**P3 - Low (Minor Issue)**
- UI glitches
- Content typos
- Enhancement requests
- Response: <24 hours

---

**Version**: 2.0.0  
**Last Updated**: 2024-12-26  
**Status**: Production Architecture Specification
