# Rentbox.ee Platform

Luxury-grade 24/7 self-service tool rental platform built with Next.js App Router, TypeScript, and TailwindCSS.

## 🎨 Design Philosophy

Scandinavian industrial minimalism:
- Quiet luxury
- Large whitespace
- Strong grid & alignment
- Subtle shadows only
- Rounded corners (12–16px)
- No gradients, no glossy effects
- Typography > decoration

## 🚀 Features

### Catalog System
- ✅ 9 locked categories with icons
- ✅ Product listing with filters and sorting
- ✅ Product detail pages with SEO metadata
- ✅ Mobile-first responsive design
- ✅ Query params drive UI state

### Booking System
- ✅ Month calendar view
- ✅ 15-minute time slots
- ✅ Europe/Tallinn timezone handling
- ✅ Compartment selection (if multiple)
- ✅ Real-time availability checking
- ✅ Booking confirmation flow

### Admin Interface
- ✅ Category management
- ✅ Product management
- ✅ Compartment management
- ✅ Booking management

### SEO & Analytics
- ✅ Server-rendered pages
- ✅ next/metadata per route
- ✅ JSON-LD Product schema
- ✅ GA4 / GTM ready
- ✅ Event tracking (category views, product views, bookings)

### Production Ready
- ✅ Error boundaries
- ✅ Loading states
- ✅ Input validation
- ✅ Edge-safe (no server-only leaks)
- ✅ Database conflict prevention

## 📁 Project Structure

```
/app
  /tooriistad              # Catalog pages
    page.tsx               # Main catalog
    /[categorySlug]         # Category listing
    /[categorySlug]/[productSlug]  # Product detail
  /broneeringud            # Booking pages
    /[bookingId]           # Booking confirmation
  /admin                   # Admin interface
  /api/bookings            # Booking API
/components
  /catalog                 # Catalog components
  /booking                 # Booking components
  /ui                      # shadcn/ui components
/lib
  /catalog                 # Catalog data layer
  /booking                 # Booking data layer
  /analytics               # Analytics tracking
/prisma
  schema.prisma            # Database schema
  seed.ts                  # Seed script
```

## 🛠️ Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/rentbox"
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"  # Optional: Google Analytics
```

3. **Initialize database:**
```bash
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

4. **Run development server:**
```bash
npm run dev
```

## 🎯 Routes

- `/tooriistad` - Main catalog
- `/tooriistad/[categorySlug]` - Category listing
- `/tooriistad/[categorySlug]/[productSlug]` - Product detail
- `/broneeringud/[bookingId]` - Booking confirmation
- `/admin` - Admin dashboard

## 📊 Analytics Events

The platform tracks:
- `category_view` - Category page viewed
- `product_view` - Product page viewed
- `search` - Search performed
- `booking_start` - Booking flow started
- `booking_confirmed` - Booking confirmed
- `booking_cancelled` - Booking cancelled

## 🔒 Brand Colors

CSS variables defined in `app/globals.css`:
- `--bg`: #F7F9F8
- `--card`: #FFFFFF
- `--text`: #0F172A
- `--muted`: #6B7280
- `--border`: #E2E8E4
- `--accent`: #1DB954
- `--accent-hover`: #159A46
- `--error`: #DC2626

## 📝 Copy Tone

Calm, professional, no hype:
- "Professionaalne tööriist, kui sul on seda päriselt vaja."
- "Rendi. Tee töö ära. Tagasta."
- "Võta kapist. Kasuta. Tagasta."

## 🚧 Next Steps

1. Connect to actual database (replace mock data in `lib/catalog/data.ts` and `lib/booking/data.ts`)
2. Add authentication for admin interface
3. Implement locker access system
4. Add payment integration
5. Set up email notifications
6. Add user accounts and booking history

## 📄 License

Proprietary - Rentbox.ee
