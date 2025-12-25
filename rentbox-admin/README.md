# Rentbox Admin Panel

Production-ready admin panel for Rentbox.ee - a 24/7 self-service tool rental platform.

## Features

- **Dashboard** with KPIs and operational alerts
- **Booking Management** with overlap detection and validation
- **Product Management** with categories and pricing
- **Locker & Compartment Management**
- **User Management** with RBAC (Owner, Admin, Operator, Viewer)
- **Audit Logging** for all administrative actions
- **Settings** for system configuration

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: iron-session
- **Validation**: Zod
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SESSION_SECRET`: Generate with `openssl rand -base64 32`
- `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Initial admin credentials

3. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser

## Default Login

After seeding, use the credentials from your `.env` file:
- Email: `admin@rentbox.ee` (or value from `ADMIN_EMAIL`)
- Password: `admin123` (or value from `ADMIN_PASSWORD`)

**⚠️ Change these immediately in production!**

## RBAC Roles

### Owner
- Full system access
- Can manage users and change roles
- Can access all features

### Admin
- Can manage products, categories, lockers, compartments
- Can manage bookings
- Can view audit logs
- Can update settings
- Cannot manage users or change roles

### Operator
- Can manage bookings
- Can set compartment maintenance
- Can view products, categories, lockers, compartments
- Cannot change prices or manage products
- Cannot access admin features

### Viewer
- Read-only access
- Can view bookings, products, categories, lockers, compartments
- Cannot make any changes

## Security Features

- Session-based authentication with httpOnly cookies
- CSRF protection via SameSite cookies
- Server-side RBAC enforcement on all mutations
- Input validation with Zod
- Audit logging for all administrative actions
- Rate limiting ready (implement as needed)

## Key Validation Rules

### Bookings
- End time must be after start time
- Cannot create bookings in the past
- Minimum duration: 15 minutes
- Automatic overlap detection
- Cancelled bookings are excluded from conflict checks

### Products
- Unique slug per product
- Cannot delete products assigned to compartments
- Cannot delete products with existing bookings

### Compartments
- Unique label per locker
- Can be marked for maintenance (active: false)

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Tests cover:
- Booking overlap detection
- Date validation
- RBAC permission system
- Role hierarchy

## Database Management

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Create Migration
```bash
npm run prisma:migrate
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

### Seed Database
```bash
npm run prisma:seed
```

## Project Structure

```
rentbox-admin/
├── app/
│   ├── admin/          # Admin pages
│   ├── api/            # API routes
│   ├── login/          # Login page
│   └── layout.tsx      # Root layout
├── components/
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── actions/        # Server actions
│   ├── admin/          # Admin utilities
│   ├── auth/           # Auth & RBAC
│   └── db/             # Database client
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seeder
└── __tests__/          # Test files
```

## Timezone Handling

All bookings are stored in UTC and displayed in `Europe/Tallinn` timezone. The system handles conversions automatically.

## Audit Logging

All administrative actions are logged with:
- Actor (user who performed action)
- Action type (CREATE, UPDATE, DELETE, STATUS_CHANGE)
- Entity type and ID
- Before/after state (JSON)
- Timestamp
- IP address (optional)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `SESSION_SECRET`
3. Enable PostgreSQL SSL
4. Set up proper CORS if needed
5. Configure rate limiting
6. Set up monitoring and alerts
7. Regular database backups
8. Review and update admin credentials

## Brand Colors

The admin panel uses Rentbox brand colors defined in `globals.css`:
- Primary: `#1DB954` (Rentbox Green)
- Primary Hover: `#159A46`
- Background: `#F7F9F8`
- Card: `#FFFFFF`
- Border: `#E2E8E4`
- Text: `#0F172A`
- Muted: `#6B7280`
- Error: `#DC2626`

## License

Proprietary - Rentbox.ee

## Support

For issues or questions, contact: info@rentbox.ee
