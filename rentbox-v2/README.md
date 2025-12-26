# Rentbox v2

**Production-grade 24/7 self-service tool rental platform with physical locker integration.**

---

## Overview

Rentbox v2 is a complete rental platform that operates unattended around the clock. It combines:

- Time-based availability management (not stock-based)
- Physical smart locker integration
- Digital contract signing (including Estonian Smart-ID/Mobiil-ID)
- Automated notifications and overdue handling
- Full audit trail for compliance

### Core Principles

1. **Server + database are the source of truth** - Always
2. **No double bookings** - Enforced at database level via exclusion constraint
3. **Physical access is logged** - Every locker event recorded with microsecond precision
4. **Users stay in control** - AI assists, never overwrites
5. **System works unattended** - 24/7 operation without human babysitting

---

## Project Structure

```
rentbox-v2/
├── ARCHITECTURE.md           # System architecture overview
├── README.md                 # This file
├── backend/                  # NestJS API server
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # SQL migrations with constraints
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── common/           # Shared utilities
│       ├── config/           # Configuration
│       ├── database/         # Prisma + Redis services
│       └── modules/          # Feature modules
│           ├── auth/
│           ├── booking/      # Core booking engine
│           ├── calendar/
│           ├── catalog/
│           ├── checkout/
│           ├── content/
│           ├── incident/
│           ├── locker/       # Hardware integration
│           ├── notification/
│           ├── return/
│           ├── seo/
│           └── user/
├── frontend/                 # Next.js application
│   ├── package.json
│   └── src/
│       ├── app/              # App router pages
│       ├── components/       # React components
│       ├── hooks/            # Custom hooks
│       ├── lib/              # Utilities
│       ├── stores/           # Zustand stores
│       └── types/            # TypeScript types
├── docs/                     # Documentation
│   ├── API_CONTRACTS.md      # Full API specification
│   ├── STATE_MACHINES.md     # Business logic & state transitions
│   ├── EDGE_CASES_AND_GUARDRAILS.md
│   └── EXAMPLE_PAYLOADS.md   # Request/response examples
└── infrastructure/           # Deployment configs
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm (recommended) or npm

### Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed sample data (optional)
pnpm db:seed

# Start development server
pnpm start:dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with API URL

# Start development server
pnpm dev
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14, Tailwind CSS, shadcn/ui | SSR + SPA, accessible UI |
| **Backend** | NestJS, TypeScript | API server, business logic |
| **Database** | PostgreSQL 15 | Primary data store, ACID |
| **Cache** | Redis 7 | Distributed locks, caching |
| **Queue** | BullMQ | Background jobs |
| **Auth** | JWT + Sessions | Authentication |
| **Payments** | Stripe | Payment processing |
| **Signing** | SK Smart-ID/Mobiil-ID | Digital signatures |
| **SMS** | Twilio | Critical notifications |
| **Email** | Resend | Transactional emails |

---

## Key Features

### 1. Time-Based Booking Engine
- Guaranteed non-overlapping bookings (database-enforced)
- Flexible duration: hourly, daily, weekly
- Real-time availability calendar
- Extension requests with conflict detection

### 2. Smart Locker Integration
- App-based unlock with PIN fallback
- Real-time status monitoring
- Automatic event logging
- Graceful hardware failure handling

### 3. Digital Contract Signing
- Typed signature for standard rentals
- Smart-ID/Mobiil-ID for high-value/B2B
- Immutable contract storage with hash verification

### 4. Automated Operations
- Pending booking expiration
- Overdue detection and escalation
- Notification scheduling
- Incident auto-creation

### 5. Full Audit Trail
- Every state change logged
- Hardware events with timestamps
- Payment records immutable
- Compliance-ready exports

---

## API Overview

Base URL: `https://api.rentbox.ee/v1`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products` | List products |
| `GET` | `/products/{slug}` | Product detail |
| `GET` | `/bookings/availability/{productId}` | Check availability |
| `POST` | `/bookings` | Create booking |
| `GET` | `/bookings/{id}` | Get booking |
| `POST` | `/bookings/{id}/extend` | Request extension |
| `POST` | `/checkout/{id}/sign` | Sign contract |
| `POST` | `/checkout/{id}/payment` | Process payment |
| `POST` | `/locker/open` | Open compartment |
| `POST` | `/return/initiate` | Start return |
| `GET` | `/me/rentals` | User's rentals |

See [API_CONTRACTS.md](docs/API_CONTRACTS.md) for full specification.

---

## Database Schema Highlights

### Critical Constraint: No Double Bookings

```sql
-- PostgreSQL exclusion constraint
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    compartment_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'expired'));
```

This constraint is the **last line of defense** against double bookings. Even if all other validation fails, the database will reject overlapping bookings.

### Booking Status Lifecycle

```
PENDING → PAID → ACTIVE → COMPLETED
    ↓        ↓       ↓
 EXPIRED  CANCELLED  OVERDUE → COMPLETED
```

See [STATE_MACHINES.md](docs/STATE_MACHINES.md) for full state machine documentation.

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/rentbox

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+372...

# Smart-ID
SMARTID_HOST=https://sid.demo.sk.ee/smart-id-rp/v2/
SMARTID_RELYING_PARTY_UUID=...
SMARTID_RELYING_PARTY_NAME=Rentbox

# Locker Hardware
LOCKER_HARDWARE_URL=https://hardware.rentbox.ee
LOCKER_MQTT_BROKER=mqtt://broker.rentbox.ee

# Configuration
BOOKING_PENDING_TTL_MINUTES=15
BOOKING_GRACE_PERIOD_MINUTES=30
LATE_FEE_MULTIPLIER=1.5
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
```

---

## Testing

```bash
# Backend unit tests
cd backend && pnpm test

# Backend e2e tests
pnpm test:e2e

# Frontend tests
cd frontend && pnpm test
```

---

## Deployment

### Production Checklist

- [ ] PostgreSQL with point-in-time recovery enabled
- [ ] Redis with persistence
- [ ] Environment variables secured (not in repo)
- [ ] Stripe webhooks configured
- [ ] Smart-ID production credentials
- [ ] Monitoring (Sentry, Prometheus)
- [ ] SSL certificates
- [ ] Rate limiting configured
- [ ] Backup strategy tested

### Recommended Stack

- **Frontend**: Vercel (Edge network, automatic SSL)
- **Backend**: Railway/Render (Managed PostgreSQL available)
- **Database**: Neon/Supabase (Serverless PostgreSQL)
- **Redis**: Upstash (Serverless Redis)
- **Storage**: Cloudflare R2 (S3-compatible)

---

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) - API specification
- [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md) - Business logic
- [docs/EDGE_CASES_AND_GUARDRAILS.md](docs/EDGE_CASES_AND_GUARDRAILS.md) - Edge cases
- [docs/EXAMPLE_PAYLOADS.md](docs/EXAMPLE_PAYLOADS.md) - API examples

---

## What The System Must NEVER Do

1. **Guess availability** - Only show database-verified slots
2. **Auto-book** - User must explicitly confirm
3. **Auto-pay** - Payment requires explicit action
4. **Hide conflicts** - Always surface booking collisions
5. **Change user intent** - No dark patterns
6. **Optimize persuasion over truth** - Accuracy > conversion
7. **Silent failures** - Every error logged and surfaced
8. **Delete audit logs** - Historical record is permanent

---

## License

Proprietary. All rights reserved.

---

## Support

For technical issues: tech@rentbox.ee
For business inquiries: info@rentbox.ee
