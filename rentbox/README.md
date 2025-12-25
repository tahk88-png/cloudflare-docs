# Rentbox.ee - Tööriistad Catalog

Complete Next.js 14 tools catalog system for Rentbox.ee smart locker platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Visit **http://localhost:3000/tooriistad**

## 📋 What's Included

### ✅ Pages
- `/tooriistad` - Main catalog with hero, categories, featured products
- `/tooriistad/[categorySlug]` - Category listing with filters, sorting, pagination
- `/tooriistad/[categorySlug]/[productSlug]` - Product detail with booking integration point

### ✅ Components
- **ProductCard** - Reusable product card with badges, pricing, actions
- **CategoryGrid** - Category cards with icons
- **FiltersPanel** - Price, unit, tags, availability filters (URL-driven)
- **SortBar** - Search + sort controls
- **Pagination** - SEO-friendly pagination
- **SkeletonGrid** - Loading states

### ✅ Features
- 🎨 **Brand Colors** - Rentbox color system in CSS variables
- 📱 **Mobile-First** - Responsive design (1/2/3 column grids)
- ⚡ **Server Components** - Fast initial render, SEO-optimized
- 🔍 **URL-Driven Filters** - All filters persist in query params
- 🔄 **Real-time Availability** - Badge system (Saadaval/Piiratud/Pole hetkel)
- 🏷️ **SEO Ready** - Dynamic metadata + JSON-LD schemas
- 🗃️ **9 Locked Categories** - Pre-seeded Estonian categories

### ✅ Tech Stack
- Next.js 14 App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- Prisma (SQLite for development)
- React Server Components

## 📚 Documentation

Full component documentation: [`/components/catalog/README.md`](./components/catalog/README.md)

## 🎯 Integration

### Booking Module
Replace the placeholder in `/app/tooriistad/[categorySlug]/[productSlug]/page.tsx`:

```tsx
import { BookingPanel } from '@/components/booking/BookingPanel'

// Replace BookingPanelPlaceholder with:
<BookingPanel 
  product={product} 
  compartments={product.compartments}
/>
```

### Database
Currently using SQLite for development. For production:

1. Update `prisma/schema.prisma` datasource to PostgreSQL/MySQL
2. Set `DATABASE_URL` in `.env.local`
3. Run migrations: `npx prisma migrate dev`

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

```env
DATABASE_URL="your-production-database-url"
```

## 📦 Build

```bash
npm run build
npm start
```

## 🎨 Brand Guidelines

All styling uses Rentbox CSS variables defined in `app/globals.css`:

- **Primary Action:** `--accent` (#1DB954 green)
- **Background:** `--bg` (#F7F9F8)
- **Cards:** `--card` (#FFFFFF)
- **Text:** `--text` (#0F172A)

## 🔧 Customization

### Add Product Tags
Tags are automatically aggregated from products. Add tags when creating products:

```typescript
tags: JSON.stringify(['Makita', 'akutrell', 'puurimine'])
```

### Modify Price Ranges
Edit `PRICE_RANGES` in `components/catalog/FiltersPanel.tsx`

### Add Sort Options
Edit `SORT_OPTIONS` in `components/catalog/SortBar.tsx` and update sort logic in `lib/catalog/data.ts`

## 📄 License

Proprietary - Rentbox.ee

---

**Ready to rent! 🚀**
