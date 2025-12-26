# Rentbox v2

**Production-grade, 24/7 self-service tool rental platform**

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design.

## Tech Stack

### Backend
- NestJS (Node.js framework)
- PostgreSQL (database)
- Redis (distributed locks, caching)
- Prisma (ORM)
- BullMQ (job queues)

### Frontend
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- TanStack Query
- Zustand

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- Redis
- MQTT broker (for locker hardware)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start dev server
npm run start:dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration

# Start dev server
npm run dev
```

## Core Features

### ✅ Implemented
- Booking Engine (time-based with conflict prevention)
- Calendar System (availability checking)
- Locker Access Service (MQTT integration)
- Database Schema (PostgreSQL with constraints)
- API Structure (NestJS modules)

### 🚧 In Progress
- User Dashboard
- Checkout & Signing
- Return Flow
- Notification Engine
- Content Creation Engine
- Product Catalog
- RBAC System
- SEO Layer

## Key Principles

1. **Availability is time-based, not stock-based**
2. **Server + database are the source of truth**
3. **No double bookings under any condition**
4. **Physical access is logged and auditable**
5. **Users stay in control; AI assists only**
6. **System must work unattended 24/7**

## Database

All timestamps use `TIMESTAMPTZ` (timezone-aware). The system enforces:
- No overlapping bookings per compartment (database constraint)
- Distributed locks via Redis for race condition prevention
- Full audit trail for all access events

## API Documentation

When running the backend, visit:
- Swagger UI: http://localhost:3001/api/docs

## License

UNLICENSED
