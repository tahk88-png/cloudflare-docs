# Rentbox v2 - Self-Service Tool Rental Platform

> Production-grade, 24/7 self-service tool rental platform with physical locker integration, time-based bookings, and full operational reliability.

## Core Principles (Non-Negotiable)

1. **Availability is time-based, not stock-based** - A tool is available if no booking exists for the requested time window
2. **Server + database are the source of truth** - Never trust client state for critical operations
3. **No double bookings under any condition** - Database constraints enforce this at the lowest level
4. **Physical access is logged and auditable** - Every locker event is immutably recorded
5. **Users stay in control; AI assists only** - AI suggests improvements, never overwrites
6. **System must work unattended 24/7** - Self-healing, auto-detection, comprehensive alerting

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RENTBOX v2 PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Web App    │    │  Mobile App  │    │  Admin Panel │                   │
│  │  (Next.js)   │    │   (React)    │    │  (Next.js)   │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                            │
│                             │                                                │
│                    ┌────────▼────────┐                                       │
│                    │   API Gateway   │                                       │
│                    │   (Rate Limit)  │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│  ┌──────────────────────────┼──────────────────────────┐                    │
│  │                   NestJS Backend                     │                    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │                    │
│  │  │ Booking │ │ Catalog │ │ Locker  │ │  User   │   │                    │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │   │                    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │                    │
│  │       │           │           │           │         │                    │
│  │  ┌────┴───────────┴───────────┴───────────┴────┐   │                    │
│  │  │              Service Layer                   │   │                    │
│  │  └────┬───────────┬───────────┬───────────┬────┘   │                    │
│  │       │           │           │           │         │                    │
│  └───────┼───────────┼───────────┼───────────┼─────────┘                    │
│          │           │           │           │                              │
│  ┌───────▼───────────▼───────────▼───────────▼────────┐                    │
│  │                   PostgreSQL                        │                    │
│  │  • Booking constraints (no overlap)                 │                    │
│  │  • All timestamps in timestamptz                    │                    │
│  │  • Full audit logging                               │                    │
│  └────────────────────┬───────────────────────────────┘                    │
│                       │                                                      │
│  ┌────────────────────▼───────────────────────────────┐                    │
│  │                     Redis                           │                    │
│  │  • Distributed locks                                │                    │
│  │  • Session cache                                    │                    │
│  │  • Rate limiting                                    │                    │
│  │  • TTL for pending bookings                         │                    │
│  └────────────────────────────────────────────────────┘                    │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Locker Hardware │  │  Notification   │  │  Payment        │             │
│  │    Service      │  │    Service      │  │   Gateway       │             │
│  │  (MQTT/HTTP)    │  │ (Email/SMS)     │  │  (Stripe/etc)   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 + React 18 | SSR for SEO, App Router |
| Styling | Tailwind CSS + shadcn/ui | Consistent, accessible UI |
| Backend | NestJS + TypeScript | Modular, testable API |
| Database | PostgreSQL 15 | ACID compliance, constraints |
| Cache | Redis 7 | Locks, sessions, TTL |
| Search | Meilisearch | Product search |
| Storage | S3-compatible | Media files |
| Hosting | Vercel + Railway | Frontend + Backend |
| CDN | Cloudflare | Edge caching, DDoS |

## Project Structure

```
rentbox-v2/
├── packages/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── booking/    # Time-based booking engine
│   │   │   │   ├── catalog/    # Products & categories
│   │   │   │   ├── locker/     # Hardware integration
│   │   │   │   ├── user/       # Auth & profiles
│   │   │   │   ├── content/    # Block editor
│   │   │   │   ├── notification/ # Email/SMS
│   │   │   │   ├── payment/    # Payment processing
│   │   │   │   ├── incident/   # Issue tracking
│   │   │   │   └── admin/      # RBAC & management
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── decorators/
│   │   │   │   └── filters/
│   │   │   └── config/
│   │   └── test/
│   │
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (public)/       # Marketing pages
│   │   │   ├── (auth)/         # Login/register
│   │   │   ├── catalog/        # Product browsing
│   │   │   ├── booking/        # Booking flow
│   │   │   ├── dashboard/      # "Minu rendid"
│   │   │   └── admin/          # Admin panel
│   │   ├── components/
│   │   └── lib/
│   │
│   ├── shared/                 # Shared types & utils
│   │   ├── types/
│   │   ├── constants/
│   │   └── validation/
│   │
│   └── locker-service/         # Hardware bridge
│       ├── mqtt/
│       └── http/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
│
└── docs/
    ├── architecture/
    ├── api/
    └── runbooks/
```

## Modules

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 1 | [Content Engine](docs/modules/01-content-engine.md) | Block-based editor with AI assistance |  |
| 2 | [Catalog System](docs/modules/02-catalog-system.md) | Products, pricing, locations | Critical |
| 3 | [Booking Engine](docs/modules/03-booking-engine.md) | Time-based reservations | Critical |
| 4 | [Calendar System](docs/modules/04-calendar-system.md) | Availability & scheduling | Critical |
| 5 | [User Dashboard](docs/modules/05-user-dashboard.md) | "Minu rendid" self-service | High |
| 6 | [Checkout & Signing](docs/modules/06-checkout-signing.md) | Payment & legal contracts | Critical |
| 7 | [Locker Service](docs/modules/07-locker-service.md) | Hardware integration | Critical |
| 8 | [Return Flow](docs/modules/08-return-flow.md) | Return & verification | High |
| 9 | [Notifications](docs/modules/09-notifications.md) | Email & SMS delivery | High |
| 10 | [Incidents](docs/modules/10-incidents.md) | Issue management | Medium |
| 11 | [RBAC](docs/modules/11-rbac.md) | Roles & permissions | High |
| 12 | [SEO Layer](docs/modules/12-seo-layer.md) | Programmatic pages | Medium |

## Quick Start

```bash
# Clone repository
git clone https://github.com/org/rentbox-v2.git
cd rentbox-v2

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Start database
docker-compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Start development
pnpm dev
```

## Documentation

- [Database Schema](docs/database/schema.md)
- [API Reference](docs/api/README.md)
- [State Machines](docs/architecture/state-machines.md)
- [Error Handling](docs/architecture/error-handling.md)
- [Deployment Guide](docs/deployment/README.md)
- [Runbooks](docs/runbooks/README.md)

## License

Proprietary - All rights reserved
