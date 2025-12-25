# Rentbox Admin Panel

Production-ready admin panel for Rentbox.ee (24/7 self-service tool rental).

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **TailwindCSS**
- **shadcn/ui**
- **PostgreSQL** (Prisma ORM)
- **Zod** (validation)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   # Copy .env.example to .env and configure DATABASE_URL
   cp .env.example .env

   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed database
   npm run db:seed
   ```

3. **Run development server:**
   ```bash
   npm run dev:admin
   ```

4. **Access admin panel:**
   - URL: http://localhost:3000/admin
   - Default owner: owner@rentbox.ee

## Features

### Admin Pages

- **Dashboard** (`/admin`) - KPIs, alerts, quick actions
- **Bookings** (`/admin/bookings`) - Manage all rental bookings
- **Products** (`/admin/products`) - Product catalog management
- **Categories** (`/admin/categories`) - Product categories
- **Lockers** (`/admin/lockers`) - Locker locations
- **Compartments** (`/admin/compartments`) - Compartment management
- **Users & Roles** (`/admin/users`) - User management (owner only)
- **Settings** (`/admin/settings`) - System settings
- **Audit Log** (`/admin/audit`) - Change tracking

### Security

- **RBAC**: owner, admin, operator, viewer roles
- **Server-side guards**: All routes protected
- **Audit logging**: All mutations tracked
- **Input validation**: Zod schemas for all inputs
- **Booking overlap prevention**: Server-side validation

### Brand Tokens

All colors use Rentbox brand tokens from `app/globals.css`:
- Primary: `#1DB954`
- Primary Hover: `#159A46`
- Background: `#F7F9F8`
- Card: `#FFFFFF`
- Border: `#E2E8E4`
- Text: `#0F172A`
- Muted: `#6B7280`
- Disabled: `#CBD5CF`
- Error: `#DC2626`

## Project Structure

```
/app/admin/          # Admin pages
/components/admin/   # Admin-specific components
/components/ui/      # shadcn/ui components
/lib/admin/          # Admin business logic
/lib/auth/           # Authentication & RBAC
/lib/db.ts           # Prisma client
/lib/timezone.ts     # Timezone utilities
/prisma/             # Database schema & migrations
```

## Authentication

Currently, authentication is stubbed. To implement:

1. **Add your auth provider** (NextAuth.js, Clerk, etc.)
2. **Update `lib/auth/requireRole.ts`** - Implement `getCurrentUser()` function:
   ```typescript
   export async function getCurrentUser(): Promise<AuthUser | null> {
     const session = await getSession(); // Your auth provider
     if (!session?.userId) return null;
     const user = await prisma.user.findUnique({ where: { id: session.userId } });
     if (!user || !user.active) return null;
     return user;
   }
   ```
3. **Update `middleware.ts`** to check sessions
4. **Add session management** and login flow

**Note**: All admin routes are protected by `requireAuth()` which redirects to `/admin/login` if not authenticated.

## Database Schema

See `prisma/schema.prisma` for full schema. Key models:

- `User` - Admin users with roles
- `Category` - Product categories
- `Product` - Rental products
- `Locker` - Locker locations
- `Compartment` - Individual compartments
- `Booking` - Rental bookings
- `AuditLog` - Change tracking

## Testing

```bash
npm test
```

Tests cover:
- Booking overlap validation
- RBAC checks
- Input validation

## Deployment

1. Set environment variables
2. Run migrations: `npm run db:migrate`
3. Build: `npm run build:admin`
4. Start: `npm run start:admin`

## Notes

- All times stored in UTC, displayed in Europe/Tallinn
- Booking overlap validation prevents conflicts
- Audit log tracks all changes
- RBAC enforced server-side
