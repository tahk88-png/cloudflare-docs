# Demo App - End-to-End Locker Rental System

A full-stack monorepo demo application for a locker rental system with realistic demo data.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL (via Docker)
- **Cache**: Redis (via Docker)
- **ORM**: Prisma
- **Validation**: Zod schemas + shared types

## Quick Start

### Prerequisites

- Node.js 22+ (check `.nvmrc` or `.node-version`)
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose

### First Run

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run first-run script (starts everything):**
   ```bash
   pnpm first-run
   ```

   This command will:
   - Start Docker containers (Postgres + Redis)
   - Run database migrations
   - Seed the database
   - Load demo data
   - Start both API and web dev servers

4. **Open your browser:**
   - Web app: http://localhost:3000
   - API: http://localhost:3001

## Available Scripts

### Root Level

- `pnpm first-run` - Complete setup and start dev servers
- `pnpm dev` - Start API + Web concurrently
- `pnpm db:up` - Start Docker containers
- `pnpm db:down` - Stop Docker containers
- `pnpm db:migrate` - Run Prisma migrations
- `pnpm db:seed` - Seed database (minimal, use demo:load for demo data)
- `pnpm demo:load` - Load realistic demo data
- `pnpm demo:reset` - Reset demo data

### Individual Apps

- `pnpm --filter api dev` - Start API only
- `pnpm --filter web dev` - Start Web only

## Project Structure

```
/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types and API client
├── prisma/           # Database schema and migrations
│   ├── schema.prisma
│   ├── seed.ts
│   ├── demo-load.ts  # Demo data generator
│   └── demo-reset.ts # Demo data cleanup
└── docker-compose.yml
```

## Demo Data

The demo includes:

- **1 Locker**: "Aespa–Kiisa demo" with 10 compartments (A01-A10)
- **10 Products**: Makita and Kärcher tools with realistic pricing
- **20+ Bookings**: Spread across the next 7 days with various statuses
- **Maintenance Blocks**: Calendar events for maintenance windows
- **Incidents**: Sample incidents (door failures, payment issues)
- **Vouchers**: 6 vouchers with varying balances
- **Discount Codes**: 4 discount codes (FIRST10, SAVE5EUR, WEEKEND20, STUDENT15)
- **Campaigns**: 2 marketing campaigns
- **System Flags**: Feature flags for checkout, maintenance mode, etc.

## API Endpoints

### Public

- `GET /api/system/health` - System health check
- `GET /api/system/flags` - Get system feature flags
- `GET /api/products` - List all products
- `GET /api/products/:slug` - Get product by slug
- `GET /api/products/:id/slots` - Get available time slots
- `POST /api/cart/add` - Add item to cart
- `GET /api/cart/:id` - Get cart contents
- `POST /api/checkout/apply-code` - Apply discount/voucher code
- `POST /api/checkout/remove-code` - Remove applied code
- `POST /api/bookings/quote` - Get booking quote
- `POST /api/bookings` - Create booking
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/extend` - Extend booking

### Admin (requires `x-admin-token` header)

- `GET /api/admin/bookings` - List all bookings
- `GET /api/admin/incidents` - List all incidents
- `POST /api/admin/incidents/:id/resolve` - Resolve incident
- `POST /api/admin/demo/load` - Reload demo data
- `POST /api/admin/demo/reset` - Reset demo data
- `POST /api/admin/system/flags` - Update system flag

## Web Routes

- `/` - Homepage with product listing
- `/tools` - Browse all tools
- `/tools/[slug]` - Product detail page with slot picker
- `/cart` - Shopping cart
- `/checkout` - Checkout page (flag-gated)
- `/dashboard` - User dashboard with bookings
- `/admin` - Admin dashboard (requires token)
  - `/admin/bookings` - All bookings
  - `/admin/incidents` - Incident management
  - `/admin/calendar` - Calendar timeline view
  - `/admin/discounts` - Discount code management
  - `/admin/vouchers` - Voucher management
  - `/admin/campaigns` - Campaign management
  - `/admin/system` - System flags and health

## Admin Access

To access admin pages:

1. Navigate to `/admin`
2. Enter the admin token (default: `demo-admin-token-12345` from `.env.example`)
3. Token is stored in localStorage for the session

## Environment Variables

### Root `.env`

```env
DATABASE_URL="postgresql://demo:demo123@localhost:5432/demo?schema=public"
REDIS_URL="redis://localhost:6379"
ADMIN_TOKEN="demo-admin-token-12345"
NEXT_PUBLIC_API_URL="http://localhost:3001"
DEMO_MODE=true
```

### `apps/api/.env.local`

```env
DATABASE_URL="postgresql://demo:demo123@localhost:5432/demo?schema=public"
REDIS_URL="redis://localhost:6379"
ADMIN_TOKEN="demo-admin-token-12345"
PORT=3001
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
DEMO_MODE=true
```

## Database Schema

Key models:

- **Product**: Tools/equipment with pricing and deposit
- **Locker**: Physical locker locations
- **Compartment**: Individual compartments within lockers
- **CompartmentProduct**: Mapping of products to compartments
- **Booking**: Rental bookings with status tracking
- **CalendarEvent**: Maintenance blocks and system events
- **Incident**: Support incidents
- **DiscountCode**: Promotional codes
- **Voucher**: Prepaid vouchers
- **Campaign**: Marketing campaigns
- **SystemFlag**: Feature flags
- **AuditLog**: System audit trail

## Status Badges

Booking statuses are displayed in Estonian:

- `PENDING` → "Ootel"
- `PAID` → "Makstud"
- `ACTIVE` → "Töös"
- `OVERDUE` → "Hilinenud"
- `COMPLETED` → "Lõpetatud"
- `CANCELLED` → "Tühistatud"

## Troubleshooting

### Docker containers not starting

```bash
pnpm db:down
pnpm db:up
```

### Database migration errors

```bash
pnpm db:down
docker volume rm demo_postgres_data  # Remove volume if needed
pnpm db:up
pnpm db:migrate
```

### Port already in use

Change ports in:
- `docker-compose.yml` (Postgres/Redis)
- `.env` files (API/Web ports)

### Demo data not loading

```bash
pnpm demo:reset
pnpm demo:load
```

## Development Notes

- The API uses in-memory cart storage (use Redis in production)
- Payment and SMS providers are stubbed (return `ok`/`degraded` status)
- Admin token is stored in localStorage (use proper auth in production)
- Booking overlap prevention uses PostgreSQL exclusion constraints

## License

Private - Demo purposes only
