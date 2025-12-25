# Rentbox.ee Production Checklist

## ✅ Core Features Complete

### Catalog System
- [x] Main catalog page with hero and category grid
- [x] Category listing pages with filters and sorting
- [x] Product detail pages with integrated booking
- [x] Product cards with luxury design
- [x] Search functionality
- [x] Pagination (SEO-friendly)

### Booking System
- [x] BookingPanel component with calendar
- [x] 15-minute time slot selection
- [x] Date → Start → End → Confirm flow
- [x] Compartment selection (when multiple)
- [x] Real-time availability checking
- [x] Booking API with validation
- [x] Booking confirmation page
- [x] Sticky CTA on mobile

### Admin Interface
- [x] Admin dashboard structure
- [x] Category management routes
- [x] Product management routes
- [x] Booking management routes
- [x] Compartment management routes

### Design System
- [x] Scandinavian industrial aesthetic
- [x] Brand colors via CSS variables
- [x] Large whitespace
- [x] Subtle shadows only
- [x] Rounded corners (12-16px)
- [x] Clean typography (Inter)
- [x] Mobile-first responsive

### SEO & Analytics
- [x] Server-rendered pages
- [x] Dynamic metadata per route
- [x] JSON-LD Product schema
- [x] Clean Estonian URLs
- [x] GA4/GTM ready analytics
- [x] Event tracking (category, product, booking)

### Production Hardening
- [x] Error boundaries
- [x] Loading states and skeletons
- [x] Input validation
- [x] Edge-safe implementation
- [x] Database conflict prevention structure

## 🔧 Integration Required

### Database
1. **Connect Prisma**
   - Update `lib/catalog/data.ts` with Prisma queries
   - Update `lib/booking/data.ts` with Prisma queries
   - Use `lib/catalog/data-prisma.ts` and `lib/booking/data-prisma.ts` as reference

2. **Run Migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Seed Database**
   ```bash
   npx tsx prisma/seed.ts
   ```

### Authentication
1. **Add to Admin Routes**
   - Update `app/admin/layout.tsx` with auth check
   - Add session management
   - Protect admin routes

### Analytics
1. **Configure GA4**
   - Set `NEXT_PUBLIC_GA_ID` environment variable
   - Verify events are firing

### Images
1. **Add Product Images**
   - Upload images to `/public/images/`
   - Update product records with image paths

## 🎯 Edge Cases Handled

- [x] Fully booked day (slots disabled)
- [x] Single remaining compartment (shows "Piiratud")
- [x] Booking spanning midnight (handled in date logic)
- [x] Past dates/times disabled
- [x] Product disabled but bookmarked (404 handling)
- [x] Mobile + poor network (loading states)
- [x] User abandons booking (no state persistence needed)
- [x] Booking conflicts (DB-level prevention)

## 📋 Data Model

### Categories (9 locked)
All categories seeded with correct slugs, icons, and descriptions.

### Products
- Base price and unit (hour/day)
- Tags for filtering
- Images array
- Active status

### Bookings
- Product and compartment references
- UTC timestamps (Europe/Tallinn UI)
- Status tracking (pending/confirmed/cancelled/completed)
- Overlap prevention

## 🚀 Deployment Steps

1. **Environment Variables**
   ```
   DATABASE_URL="postgresql://..."
   NEXT_PUBLIC_GA_ID="G-..."
   NODE_ENV="production"
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Database**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Deploy**
   - Deploy to Vercel/Netlify/your platform
   - Ensure environment variables are set
   - Verify database connection

## 📝 Copy Guidelines

All Estonian copy follows calm, professional tone:
- No hype
- No pressure
- Clear, direct language
- Examples:
  - "Professionaalne tööriist, kui sul on seda päriselt vaja."
  - "Rendi. Tee töö ära. Tagasta."
  - "Võta kapist. Kasuta. Tagasta."

## ✨ Design Principles

- Quiet luxury
- Scandinavian industrial minimalism
- Large whitespace
- Strong grid & alignment
- Subtle shadows only
- Rounded corners 12–16px
- No gradients, no glossy effects
- Typography > decoration

## 🔒 Brand Colors (Locked)

- Primary/Accent: #1DB954
- Accent Hover: #159A46
- Background: #F7F9F8
- Surface/Card: #FFFFFF
- Border: #E2E8E4
- Text Primary: #0F172A
- Text Muted: #6B7280
- Disabled: #CBD5CF
- Error: #DC2626
