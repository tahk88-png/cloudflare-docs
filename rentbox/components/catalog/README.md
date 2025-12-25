# Rentbox.ee Catalog Components

Complete tools catalog system for Rentbox.ee with Next.js 14 App Router, TypeScript, TailwindCSS, and shadcn/ui.

## 🎯 Overview

This catalog provides a fast, mobile-first, SEO-ready solution for browsing and renting tools from Rentbox smart lockers 24/7.

## 📁 Structure

```
/app/tooriistad/
├── page.tsx                              # Main catalog page
├── [categorySlug]/
│   ├── page.tsx                          # Category listing page
│   └── [productSlug]/
│       └── page.tsx                      # Product detail page

/components/catalog/
├── CategoryGrid.tsx                       # Category cards grid
├── ProductCard.tsx                        # Reusable product card
├── FiltersPanel.tsx                       # Filter controls (client)
├── SortBar.tsx                            # Search + sort (client)
├── Pagination.tsx                         # SEO-friendly pagination
└── SkeletonGrid.tsx                       # Loading states

/lib/catalog/
├── data.ts                                # Data access functions
└── query.ts                               # Query param utilities
```

## 🎨 Brand Colors (CSS Variables)

All colors are defined in `app/globals.css`:

```css
--bg: #F7F9F8              /* Background */
--card: #FFFFFF             /* Card backgrounds */
--text: #0F172A             /* Primary text */
--muted: #6B7280            /* Secondary text */
--border: #E2E8E4           /* Borders */
--accent: #1DB954           /* Primary actions (green) */
--accent-hover: #159A46     /* Accent hover state */
--accent-foreground: #FFFFFF /* Text on accent */
--disabled: #CBD5CF         /* Disabled states */
--error: #DC2626            /* Error states */
```

## 🔧 Core Components

### ProductCard

Reusable product card with badges, pricing, and actions.

**Props:**
- `product: Product` - Product data with compartmentCount
- `categorySlug: string` - For building URLs

**Features:**
- Image with hover zoom
- 24/7, category, and availability badges
- Price display with unit label
- "Broneeri" and "Vaata detaile" buttons
- Entire card clickable

**Usage:**
```tsx
<ProductCard product={product} categorySlug="puurimine-kinnitamine" />
```

### CategoryGrid

Grid of category cards with icons and descriptions.

**Props:**
- `categories: Category[]` - List of categories

**Usage:**
```tsx
<CategoryGrid categories={categories} />
```

### FiltersPanel (Client Component)

Filter controls with URL state synchronization.

**Props:**
- `availableTags?: string[]` - Available filter tags
- `showLocationFilter?: boolean` - Show location filter (default: false)

**Features:**
- Price ranges: 0–15€, 15–30€, 30€+
- Rental units: hour/day
- Tags: dynamic from products
- Availability: available/limited/unavailable
- Clear all filters button

**URL Integration:**
All filter changes update URL query params instantly without page reload.

### SortBar (Client Component)

Search input and sort dropdown.

**Features:**
- Global search input
- Sort options:
  - Popular (default)
  - Price: low → high
  - Price: high → low
  - Newest

**URL Integration:**
Search query (`?q=`) and sort (`?sort=`) update URL params.

### Pagination

SEO-friendly pagination with proper link structure.

**Props:**
- `currentPage: number`
- `totalPages: number`
- `total: number` - Total product count

**Features:**
- Previous/Next buttons
- Page number links (smart ellipsis for 7+ pages)
- Mobile-friendly compact view
- Uses real links (not client-side only) for SEO

### SkeletonGrid

Loading skeletons for product and category grids.

**Exports:**
- `SkeletonGrid` - Product card skeletons
- `CategorySkeletonGrid` - Category card skeletons

## 📊 Data Layer

### lib/catalog/data.ts

Server-side data access functions using Prisma.

**Key Functions:**

```typescript
// Get all active categories (cached)
getCategories(): Promise<Category[]>

// Get category by slug (cached)
getCategoryBySlug(slug: string): Promise<Category | null>

// Get products with filters
getProducts(filters: ProductFilters): Promise<{
  products: Product[]
  total: number
  pages: number
}>

// Get single product (cached)
getProductBySlug(slug: string): Promise<Product | null>

// Get featured products (cached)
getFeaturedProducts(limit?: number): Promise<Product[]>

// Get all unique tags (cached)
getAllTags(): Promise<string[]>

// Get availability status
getAvailabilityStatus(count: number): AvailabilityStatus
```

**Caching:**
All getter functions use React's `cache()` for automatic deduplication within a single request.

### lib/catalog/query.ts

Query parameter parsing and URL building utilities.

**Key Functions:**

```typescript
// Parse URL params to filters
parseFilters(searchParams): ProductFilters

// Serialize filters to URL params
serializeFilters(filters): URLSearchParams

// Build URL with filters
buildUrl(basePath, filters): string

// Update single filter
updateFilter(filters, key, value): ProductFilters

// Toggle multi-value filter
toggleFilter(filters, key, value): ProductFilters

// Clear all filters
clearFilters(): ProductFilters
```

## 🗄️ Database Schema

### Categories
- 9 locked categories with Estonian names
- Ordered, with icons and descriptions

### Products
- Linked to categories
- Tags stored as JSON array
- Images stored as JSON array
- Price with unit (hour/day)
- Featured flag for homepage

### Lockers & Compartments
- Multiple lockers support
- Compartments link products to physical locations
- Active flag for availability

## 🔄 Query Parameters

All filters are URL-driven for SEO and sharing:

```
/tooriistad/puurimine-kinnitamine?
  q=makita                        # Search query
  &sort=price-asc                 # Sort order
  &price=0-15&price=15-30         # Price ranges (multi)
  &unit=day                       # Rental units (multi)
  &tags=Makita&tags=puurimine     # Tags (multi)
  &availability=available         # Availability (multi)
  &page=2                         # Page number
```

## 🎯 Pages

### 1. Main Catalog (`/tooriistad`)

**Sections:**
- Hero with search bar
- Trust badges (24/7, hourly/daily, instant access)
- Category grid (2 cols mobile, 3–4 desktop)
- Featured products section
- CTA section

**SEO:**
- Page title, description
- Structured data ready

### 2. Category Page (`/tooriistad/[categorySlug]`)

**Sections:**
- Breadcrumbs
- Category header (icon, title, description)
- Filters sidebar (sticky on desktop)
- Search + sort bar
- Product grid (responsive: 1/2/3 cols)
- Pagination

**Features:**
- Server-side rendering for SEO
- Client-side filter interactions (URL state)
- Suspense boundaries for loading states
- Empty state handling

### 3. Product Detail (`/tooriistad/[categorySlug]/[productSlug]`)

**Sections:**
- Breadcrumbs
- Image gallery
- Product info (title, description, price)
- Badges (24/7, category, tags, availability)
- Trust line
- Specifications/features
- Availability status
- Locations (if multiple)
- Booking panel placeholder (integrate with existing module)

**SEO:**
- Dynamic metadata
- JSON-LD Product schema
- OpenGraph tags

## 🚀 Setup

### 1. Install Dependencies

```bash
cd rentbox
npm install
```

### 2. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with locked categories + sample products
npm run db:seed
```

### 3. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000/tooriistad

## 🎨 Customization

### Add New Product

```typescript
await prisma.product.create({
  data: {
    slug: 'new-product',
    name: 'Product Name',
    shortDescription: 'Short benefit line',
    description: 'Full description',
    categoryId: 'category-id',
    tags: JSON.stringify(['tag1', 'tag2']),
    basePrice: 15,
    priceUnit: 'day',
    images: JSON.stringify(['/path/to/image.jpg']),
    featured: true,
  },
})
```

### Customize Filters

Edit `components/catalog/FiltersPanel.tsx`:
- Modify `PRICE_RANGES`
- Add custom filter types
- Adjust styling

### Change Sort Options

Edit `components/catalog/SortBar.tsx`:
- Add new sort options to `SORT_OPTIONS`
- Update `getSortOrder()` in `lib/catalog/data.ts`

## 🔗 Integration Points

### Booking Module

The product detail page includes a booking panel placeholder at `#booking`.

**To integrate:**
1. Import your existing BookingPanel component
2. Replace `BookingPanelPlaceholder` in `/app/tooriistad/[categorySlug]/[productSlug]/page.tsx`
3. Pass product and compartment data as props

### Multiple Lockers

If you have multiple locker locations:
- Set `showLocationFilter={true}` in FiltersPanel
- Implement location filter logic in `lib/catalog/data.ts`
- Update UI to show location-specific availability

## 🌐 Internationalization

Current language: **Estonian (et)**

To add other languages:
1. Extract all hardcoded strings to a dictionary
2. Use Next.js i18n or next-intl
3. Store category names/descriptions in multiple languages

## 📱 Mobile-First Design

- Responsive grids (1/2/3 columns)
- Touch-friendly buttons (min height 44px)
- Mobile filter drawer option (using shadcn Sheet)
- Optimized images with Next.js Image

## ⚡ Performance

- Server Components for initial render
- React cache() for deduplication
- Suspense boundaries for streaming
- Image optimization with next/image
- Minimal client-side JavaScript

## 🔍 SEO Features

- Server-side rendering
- Dynamic metadata per page
- JSON-LD structured data (Product schema)
- Semantic HTML (breadcrumbs, headings)
- Proper link structure in pagination
- OpenGraph tags

## 🎯 Copy Guidelines

All Estonian copy follows direct, benefit-focused style:

- **Hero:** "Tööriistad 24/7. Rendi ainult siis, kui vaja."
- **Buttons:** "Broneeri", "Vaata detaile"
- **Badges:** "Saadaval", "Piiratud", "Pole hetkel"
- **Trust:** "Võta kapist, kasuta, tagasta"

## 🐛 Error Handling

- 404 pages for missing categories/products
- Empty states for no results
- Loading skeletons during data fetch
- Form validation in search/filters

## 📝 License

Part of Rentbox.ee platform.

---

**Built with ❤️ for Rentbox.ee**
