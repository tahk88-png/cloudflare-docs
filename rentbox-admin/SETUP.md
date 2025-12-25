# Rentbox Admin Panel - Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd rentbox-admin
npm install
```

### 2. Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env
```

**Edit `.env` and update:**

```env
# Your PostgreSQL database URL
DATABASE_URL="postgresql://user:password@localhost:5432/rentbox?schema=public"

# Generate a secure secret (run this command):
# openssl rand -base64 32
SESSION_SECRET="your-generated-secret-here"

# Initial admin credentials (CHANGE IN PRODUCTION!)
ADMIN_EMAIL="admin@rentbox.ee"
ADMIN_PASSWORD="secure-password-123"

NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### 3. Set Up Database
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data (creates admin user, categories, demo locker)
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access Admin Panel
Open [http://localhost:3001](http://localhost:3001)

**Login with:**
- Email: `admin@rentbox.ee` (or your ADMIN_EMAIL)
- Password: `admin123` (or your ADMIN_PASSWORD)

## What's Included

✅ **Complete Admin UI** with Rentbox branding  
✅ **Dashboard** with KPIs and alerts  
✅ **Bookings Management** with overlap detection  
✅ **Product & Category Management**  
✅ **Locker & Compartment Management**  
✅ **User Management** with RBAC  
✅ **Audit Logging** for all actions  
✅ **Settings** page  
✅ **Authentication** with session management  
✅ **Tests** for booking overlap and RBAC  

## Initial Seeded Data

After running `npm run prisma:seed`, you'll have:

- **1 Owner user** (your credentials)
- **4 Categories**:
  - Power Tools
  - Hand Tools
  - Garden Equipment
  - Ladders & Scaffolding
- **1 Demo Locker**:
  - Name: "Tallinn Central"
  - Location: "Viru keskus, Tallinn"
  - 8 Compartments (A1-A3, B1-B3, C1-C2)
- **Default Settings**:
  - Slot duration: 15 minutes
  - Min rental: 60 minutes
  - Timezone: Europe/Tallinn

## Next Steps

1. **Change Admin Password**
   - Log in and update your password

2. **Add Real Products**
   - Navigate to Products page
   - Create your rental products with pricing

3. **Configure Lockers**
   - Update the demo locker or create new ones
   - Assign products to compartments

4. **Set Up Additional Users**
   - Navigate to Users page
   - Create users with appropriate roles:
     - **Owner**: Full access (you)
     - **Admin**: Manage everything except users
     - **Operator**: Manage bookings & maintenance
     - **Viewer**: Read-only access

5. **Review Settings**
   - Adjust default rental parameters
   - Update contact information

## Database Management

### View Data (Prisma Studio)
```bash
npm run prisma:studio
```
Opens at `http://localhost:5555`

### Create New Migration
```bash
npm run prisma:migrate
```

### Reset Database (⚠️ Deletes all data)
```bash
npx prisma migrate reset
npm run prisma:seed
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Coverage
- ✅ Booking overlap detection
- ✅ Date validation
- ✅ RBAC permissions
- ✅ Role hierarchy

## Common Tasks

### Create a Booking
1. Go to Bookings page
2. Click "Create Booking"
3. Select locker, compartment, product
4. Choose date/time range
5. System validates for overlaps automatically

### Assign Product to Compartment
1. Go to Products page
2. Create a product with all details
3. Go to Compartments page
4. (Note: In production, add UI to assign products)

### Mark Compartment for Maintenance
1. Go to Compartments page
2. Toggle compartment to inactive
3. Add maintenance notes
4. System prevents new bookings

### View Audit Log
1. Go to Audit Log page
2. See all administrative actions
3. Filter by actor, entity, or date
4. Review before/after changes

## Security Checklist

Before going to production:

- [ ] Change `SESSION_SECRET` to strong random value
- [ ] Update `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Enable PostgreSQL SSL
- [ ] Configure CORS if using separate frontend
- [ ] Set up rate limiting on mutations
- [ ] Enable database backups
- [ ] Set up monitoring and alerts
- [ ] Review and restrict user roles
- [ ] Test RBAC permissions thoroughly

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Ensure database exists: `createdb rentbox`

### Session Issues
- Regenerate `SESSION_SECRET`
- Clear browser cookies
- Check cookie settings in production

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Prisma Issues
```bash
# Regenerate client
npm run prisma:generate

# Reset and reseed
npx prisma migrate reset
npm run prisma:seed
```

## Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
DATABASE_URL="postgresql://user:pass@host:5432/rentbox?sslmode=require"
SESSION_SECRET="strong-random-secret-at-least-32-characters"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://admin.rentbox.ee"
```

### Deployment Platforms
- **Vercel**: Automatic deployment from Git
- **Railway**: Database + App in one platform
- **Docker**: Use `Dockerfile` for containerization
- **VPS**: Use PM2 or systemd for process management

## API Endpoints

All API routes are under `/api/admin/*` and require authentication:

- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `GET /api/admin/lockers` - List lockers
- `GET /api/admin/compartments` - List compartments
- `GET /api/admin/products` - List products
- `GET /api/admin/categories` - List categories
- `PUT /api/admin/settings` - Update settings

All mutations use Server Actions for better security and UX.

## Architecture

```
├── Authentication Layer (iron-session + middleware)
├── RBAC Layer (role-based access control)
├── Server Actions (zod validation + audit logging)
├── Prisma ORM (type-safe database access)
└── PostgreSQL (data persistence)
```

## Support

- **Documentation**: See `README.md`
- **Issues**: Check troubleshooting section
- **Email**: info@rentbox.ee

---

**🎉 You're all set! Happy renting!**
