# Rentbox Tööriistad Catalog

A Next.js App Router application for the Rentbox.ee tool rental catalog. Built with TypeScript, TailwindCSS, and shadcn/ui components.

## Features

- 🔧 **Tool Catalog** - Browse tools by category with filtering and sorting
- 📱 **Mobile-First** - Responsive design optimized for all devices
- 🔍 **SEO Ready** - Server-side rendering, metadata, and JSON-LD schemas
- 🎨 **Rentbox Brand** - Consistent styling with the Rentbox color system
- ⚡ **Fast** - Server Components for optimal performance
- 🇪🇪 **Estonian UI** - Full Estonian language support

## Pages

| Route | Description |
|-------|-------------|
| `/tooriistad` | Main catalog with categories and featured products |
| `/tooriistad/[categorySlug]` | Category page with filters, sorting, and pagination |
| `/tooriistad/[categorySlug]/[productSlug]` | Product detail page with specs and booking |

## Categories (Locked)

1. 🪴 **Aiatöö** - Muruhooldus ja õuetööd
2. 🧰 **Puurimine & kinnitamine** - Trellid ja kinnitustööd
3. 🪚 **Lõikamine & saagimine** - Saed ja lõiketööd
4. 🧽 **Lihvimine & viimistlus** - Lihv, frees, poleerimine
5. 🧼 **Puhastus** - Survepesu ja tolmuvaba töö
6. 🧱 **Betoon & kivimaterjal** - Kivi ja betooni tööriistad
7. 📏 **Mõõdistamine & märkimine** - Täpne mõõt ja nivoo
8. 🛠️ **Tõstmine & transport** - Liigutamine ja tõstmine
9. 🔩 **Tarvikud & kulumaterjal** - Otsikud, kettad, akud, lisad

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Create a `.env.local` file if needed:

```env
# Database (if using Prisma)
DATABASE_URL="postgresql://..."

# Other config
NEXT_PUBLIC_SITE_URL="https://rentbox.ee"
```

## Project Structure

```
src/
├── app/
│   ├── tooriistad/
│   │   ├── page.tsx                    # Main catalog
│   │   ├── [categorySlug]/
│   │   │   ├── page.tsx                # Category listing
│   │   │   ├── not-found.tsx
│   │   │   └── [productSlug]/
│   │   │       ├── page.tsx            # Product detail
│   │   │       └── not-found.tsx
│   │   └── layout.tsx
│   ├── globals.css                     # Brand colors
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── catalog/
│   │   ├── ProductCard.tsx             # Product card component
│   │   ├── CategoryGrid.tsx            # Category grid
│   │   ├── ProductGrid.tsx             # Product grid
│   │   ├── FiltersPanel.tsx            # Filter sidebar
│   │   ├── SortBar.tsx                 # Search + sort
│   │   ├── Pagination.tsx              # SEO pagination
│   │   ├── Breadcrumbs.tsx
│   │   ├── SearchBar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── SkeletonGrid.tsx
│   │   └── README.md                   # Component docs
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── catalog/
│   │   ├── data.ts                     # Data access layer
│   │   ├── query.ts                    # URL query utilities
│   │   └── types.ts                    # TypeScript types
│   └── utils.ts
└── prisma/
    └── seed.ts                         # Database seed
```

## Brand Colors

The application uses CSS custom properties for consistent theming:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | #F7F9F8 | Page background |
| `--card` | #FFFFFF | Card backgrounds |
| `--text` | #0F172A | Primary text |
| `--muted` | #6B7280 | Secondary text |
| `--border` | #E2E8E4 | Borders |
| `--accent` | #1DB954 | Primary actions |
| `--accent-hover` | #159A46 | Hover states |
| `--accent-foreground` | #FFFFFF | Text on accent |
| `--disabled` | #CBD5CF | Disabled states |
| `--error` | #DC2626 | Error states |

## Filters & URL State

The catalog supports URL-driven filtering:

```
/tooriistad/aiatoo?q=makita&sort=price-asc&price=15-30&unit=day&tags=aku&availability=available&page=1
```

| Param | Values | Description |
|-------|--------|-------------|
| `q` | string | Search query |
| `sort` | popular, price-asc, price-desc, newest | Sort order |
| `price` | 0-15, 15-30, 30+ | Price bucket filter |
| `unit` | hour, day | Rental unit filter |
| `tags` | comma-separated | Tag filter |
| `availability` | all, available, limited | Availability filter |
| `page` | number | Pagination |

## Product Availability

Products display availability badges based on compartment count:

- **Saadaval** (green) - `compartmentCount > 1`
- **Piiratud** (yellow) - `compartmentCount === 1`
- **Pole hetkel** (muted) - `compartmentCount === 0`

## Components

All catalog components are documented in `/src/components/catalog/README.md`.

Key components:
- `ProductCard` - Reusable product card with badges and actions
- `CategoryGrid` - Category card grid for homepage
- `FiltersPanel` - Filter controls (desktop sidebar + mobile drawer)
- `SortBar` - Search input with sort dropdown
- `Pagination` - SEO-friendly page navigation

## Data Layer

Currently uses in-memory data for development. To connect to a database:

1. Set up Prisma with your database
2. Update `/src/lib/catalog/data.ts` to use Prisma client
3. Run seed script: `npm run seed`

## Performance Optimizations

- Server Components for initial render (SEO + performance)
- Cached data fetching where appropriate
- Image optimization with `next/image`
- Minimal client-side JavaScript
- Skeleton loading states

## Integration with Booking Module

The product detail page includes a `BookingPanel` section placeholder. To integrate with the existing Rentbox booking module:

1. Import the BookingPanel component
2. Pass the product ID and locker selection
3. Handle booking flow with existing APIs

## License

Proprietary - Rentbox OÜ
