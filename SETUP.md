# Rentbox.ee Tööriistad Catalog Setup

This is a Next.js App Router catalog implementation for Rentbox.ee tools rental.

## Prerequisites

- Node.js 22+
- PostgreSQL database
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install next@^15.0.0 react@^19.0.0 react-dom@^19.0.0 @prisma/client prisma clsx tailwind-merge
```

2. Set up environment variables:
Create a `.env` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/rentbox?schema=public"
```

3. Initialize Prisma:
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

Or run the seed script directly:
```bash
npx tsx prisma/seed.ts
```

## Development

Run the development server:
```bash
npm run dev
```

The catalog will be available at:
- Main catalog: http://localhost:3000/tooriistad
- Category pages: http://localhost:3000/tooriistad/[categorySlug]
- Product pages: http://localhost:3000/tooriistad/[categorySlug]/[productSlug]

## Project Structure

```
/app
  /tooriistad
    page.tsx                    # Main catalog page
    /[categorySlug]
      page.tsx                  # Category listing page
      /[productSlug]
        page.tsx                # Product detail page
/components
  /catalog
    CategoryGrid.tsx            # Category grid component
    ProductCard.tsx             # Product card component
    FiltersPanel.tsx            # Mobile filter drawer
    SortBar.tsx                 # Search and sort bar
    Pagination.tsx              # Pagination component
    SkeletonGrid.tsx            # Loading skeleton
    CategoryListing.tsx         # Server component for category listing
    CategoryListingClient.tsx   # Client component for category listing
  /ui                           # shadcn/ui components
/lib
  /catalog
    data.ts                     # Data access layer
    query.ts                    # Query param utilities
/prisma
  schema.prisma                 # Database schema
  seed.ts                       # Seed script with 9 categories
```

## Features

✅ 9 locked categories with icons and descriptions
✅ Product listing with filters and sorting
✅ Product detail pages with SEO metadata
✅ Mobile-first responsive design
✅ Query params drive UI state
✅ SEO-friendly pagination
✅ JSON-LD schema for products
✅ Rentbox brand colors via CSS variables

## Integration Notes

1. **Database**: Replace mock data in `lib/catalog/data.ts` with actual Prisma queries
2. **Booking Panel**: Integrate BookingPanel component in product detail page
3. **Images**: Add product images to `/public/images/` directory
4. **Availability**: Update availability logic based on actual compartment/booking data

## Brand Colors

CSS variables defined in `app/globals.css`:
- `--bg`: #F7F9F8
- `--card`: #FFFFFF
- `--text`: #0F172A
- `--muted`: #6B7280
- `--border`: #E2E8E4
- `--accent`: #1DB954
- `--accent-hover`: #159A46
- `--error`: #DC2626
