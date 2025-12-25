# 🚀 Rentbox.ee Catalog - Quick Start Guide

## One-Command Setup

```bash
cd /workspace/rentbox
./scripts/setup.sh
```

This installs dependencies, sets up database, and seeds data.

## Start Development

```bash
npm run dev
```

**Visit:** http://localhost:3000/tooriistad

---

## 📍 Key URLs

- **Main Catalog:** `/tooriistad`
- **Category Example:** `/tooriistad/puurimine-kinnitamine`
- **Product Example:** `/tooriistad/puurimine-kinnitamine/akutrell-makita-18v`

---

## 🎯 Test Features

### 1. Browse Categories
Navigate to `/tooriistad` → Click any category card

### 2. Filter Products
On category page:
- Check price range "0–15€"
- Check tag "Makita"
- URL updates: `?price=0-15&tags=Makita`

### 3. Search
Enter "trell" in search → Products filter instantly

### 4. Sort
Change sort to "Hind: madal → kõrge" → Products re-sort

### 5. Product Detail
Click any product → See full detail page with booking integration point

---

## 🔌 Next Steps

### 1. Replace Placeholder Images
Add real tool images to `/public/images/`

### 2. Integrate Booking Module
In `/app/tooriistad/[categorySlug]/[productSlug]/page.tsx`:

Replace:
```tsx
<BookingPanelPlaceholder />
```

With:
```tsx
import { BookingPanel } from '@/components/booking/BookingPanel'

<BookingPanel 
  product={product}
  compartments={product.compartments}
/>
```

### 3. Deploy
```bash
npm run build
vercel deploy
```

---

## 📚 Documentation

- **README.md** - Main project overview
- **IMPLEMENTATION.md** - Complete implementation details
- **components/catalog/README.md** - Component documentation

---

## 🎨 Brand Colors

All components use Rentbox CSS variables:

- **Primary Action:** `--accent` (#1DB954 green)
- **Background:** `--bg` (#F7F9F8)
- **Cards:** `--card` (#FFFFFF)

See `app/globals.css` for all variables.

---

## 🛠️ Commands

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed database
```

---

## ✅ What's Included

- ✅ 3 main pages (catalog, category, product detail)
- ✅ 6 catalog components (reusable)
- ✅ 9 shadcn/ui components
- ✅ Prisma database with seed data
- ✅ URL-driven filters & sorting
- ✅ SEO optimization (metadata + JSON-LD)
- ✅ Mobile-first responsive design
- ✅ Rentbox brand styling
- ✅ Estonian copy throughout

---

**Ready to rent! 🎉**
