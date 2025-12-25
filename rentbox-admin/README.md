# Rentbox Admin Panel

Production-ready admin panel for Rentbox.ee - 24/7 self-service tool rental service.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based sessions with RBAC

## Features

### Core Functionality
- 📊 **Dashboard** - KPI cards, alerts, quick actions
- 📅 **Bookings** - Full CRUD, filtering, status management, overlap prevention
- 📦 **Products** - Management with pricing, categories, images
- 📁 **Categories** - Ordered list with drag-and-drop reordering
- 🏢 **Lockers** - Location management
- 🗄️ **Compartments** - Product assignment, maintenance mode
- 👥 **Users & Roles** - RBAC with 4 roles (owner, admin, operator, viewer)
- 📜 **Audit Log** - Immutable change history
- ⚙️ **Settings** - System configuration

### Security
- Server-side authentication with JWT
- RBAC (Role-Based Access Control) on all routes and actions
- Server-side validation with Zod
- Rate limiting on mutations
- Audit logging for all changes
- CSRF-safe patterns

### Design
- Rentbox brand colors (Primary: #1DB954)
- Luxury industrial aesthetic
- Mobile-first, optimized for desktop operations
- Keyboard accessible
- Dense but readable tables

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or pnpm

### Installation

1. Clone and install dependencies:
```bash
cd rentbox-admin
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

3. Set up the database:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:3000

### Default Login Credentials

After seeding:
- **Owner**: owner@rentbox.ee / Owner123!
- **Admin**: admin@rentbox.ee / Admin123!

## RBAC Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access to all features including role management |
| **Admin** | Most features except role management |
| **Operator** | Manage bookings, compartment maintenance, no pricing |
| **Viewer** | Read-only access to dashboard, bookings, products |

## Project Structure

```
rentbox-admin/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeding
├── src/
│   ├── app/
│   │   ├── admin/          # Admin pages
│   │   ├── actions/        # Server actions
│   │   └── login/          # Auth pages
│   ├── components/
│   │   ├── admin/          # Admin components
│   │   └── ui/             # shadcn/ui components
│   └── lib/
│       ├── admin/          # Admin business logic
│       ├── auth/           # Authentication
│       └── db/             # Database client
├── __tests__/              # Test files
└── ...config files
```

## API

All mutations use Server Actions with:
- Zod validation
- RBAC permission checks
- Audit logging
- Rate limiting

## Timezone

- All dates stored in UTC
- Displayed in Europe/Tallinn timezone
- Consistent across all lockers

## Testing

```bash
# Run tests
npm test

# Run tests once
npm run test:run
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Run database migrations:
```bash
npm run db:migrate
```

3. Start production server:
```bash
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `SESSION_COOKIE_NAME` | Name of session cookie |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `RATE_LIMIT_MAX` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms |

## License

Proprietary - Rentbox.ee
