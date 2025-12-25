# Rentbox Tööriistad Catalog Components

This directory contains all the reusable components for the Rentbox tool rental catalog.

## Components Overview

### ProductCard
Displays a single product with image, title, description, price, availability badge, and action buttons.

```tsx
import { ProductCard } from "@/components/catalog";

<ProductCard product={product} categoryName="Aiatöö" />
```

**Props:**
- `product: Product` - Product data object
- `categoryName?: string` - Optional category name for badge

### CategoryGrid
Displays a grid of category cards linking to category pages.

```tsx
import { CategoryGrid } from "@/components/catalog";

<CategoryGrid categories={categories} />
```

### ProductGrid
Displays a responsive grid of product cards.

```tsx
import { ProductGrid } from "@/components/catalog";

<ProductGrid products={products} categoryName="Puhastus" />
```

### FiltersPanel
Filter controls for price, unit, tags, and availability. Works with URL query params.

```tsx
import { FiltersPanel } from "@/components/catalog";

<FiltersPanel 
  filters={currentFilters} 
  showLocationFilter={true}
  onClose={() => setOpen(false)} // For mobile drawer
/>
```

### SortBar
Search input and sort dropdown. Includes mobile filter trigger.

```tsx
import { SortBar } from "@/components/catalog";

<SortBar 
  filters={currentFilters} 
  totalResults={42} 
  showMobileFilters={true}
/>
```

### Pagination
SEO-friendly pagination with page links.

```tsx
import { Pagination } from "@/components/catalog";

<Pagination
  currentPage={1}
  totalPages={5}
  basePath="/tooriistad/aiatoo"
  filters={currentFilters}
/>
```

### Breadcrumbs
Navigation breadcrumbs for category/product pages.

```tsx
import { Breadcrumbs } from "@/components/catalog";

<Breadcrumbs items={[
  { label: "Tööriistad", href: "/tooriistad" },
  { label: "Aiatöö", href: "/tooriistad/aiatoo" },
  { label: "Makita muruniiduk" }
]} />
```

### SearchBar
Global search input with submit handler.

```tsx
import { SearchBar } from "@/components/catalog";

<SearchBar 
  placeholder="Otsi tööriistu..."
  basePath="/tooriistad"
/>
```

### EmptyState
Shown when no products match filters.

```tsx
import { EmptyState } from "@/components/catalog";

<EmptyState 
  title="Tööriistu ei leitud"
  description="Proovi teisi filtreid"
  showBackLink={true}
/>
```

### SkeletonGrid
Loading skeleton for product/category grids.

```tsx
import { SkeletonGrid } from "@/components/catalog";

<SkeletonGrid count={6} variant="products" />
<SkeletonGrid count={9} variant="categories" />
```

## Data Flow

1. **Server Components** fetch data and render initial HTML (SEO)
2. **URL Query Params** drive filter/sort state (`?q=&sort=&price=&tags=`)
3. **Client Components** update URL on user interaction
4. **Page re-renders** with new data based on updated params

## Brand Colors (CSS Variables)

All components use the Rentbox brand colors defined in `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | #F7F9F8 | Page background |
| `--card` | #FFFFFF | Card backgrounds |
| `--text` | #0F172A | Primary text |
| `--muted` | #6B7280 | Secondary text |
| `--border` | #E2E8E4 | Borders |
| `--accent` | #1DB954 | Primary actions, highlights |
| `--accent-hover` | #159A46 | Hover state |
| `--accent-foreground` | #FFFFFF | Text on accent |
| `--disabled` | #CBD5CF | Disabled states |
| `--error` | #DC2626 | Error states |

## Availability Badges

Products display availability based on compartment count:

- **Saadaval** (green) - Multiple compartments available
- **Piiratud** (yellow) - Only 1 compartment available
- **Pole hetkel** (muted) - No compartments available

## Mobile-First Design

- 1 column on mobile
- 2 columns on tablet (sm: 640px)
- 3 columns on desktop (lg: 1024px)
- Mobile filter drawer via Sheet component
- Touch-friendly button sizes (min 44px)

## SEO Features

- Server-side rendering for all pages
- Dynamic metadata per route
- JSON-LD Product schema on product pages
- SEO-friendly pagination (not infinite scroll)
- Semantic HTML structure

## Usage Example

```tsx
// app/tooriistad/[categorySlug]/page.tsx
import { ProductGrid, SortBar, FiltersPanel, Pagination } from "@/components/catalog";

export default async function CategoryPage({ params, searchParams }) {
  const category = await getCategoryBySlug(params.categorySlug);
  const filters = parseFilters(searchParams);
  const result = await getProducts(params.categorySlug, filters);

  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block w-64">
        <FiltersPanel filters={filters} />
      </aside>
      <div className="flex-1">
        <SortBar filters={filters} totalResults={result.total} />
        <ProductGrid products={result.items} />
        <Pagination {...result} basePath={`/tooriistad/${params.categorySlug}`} />
      </div>
    </div>
  );
}
```
