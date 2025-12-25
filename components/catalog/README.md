# Catalog Components

Reusable components for the Rentbox.ee tools catalog ("Tööriistad").

## Components

### CategoryGrid
Displays a grid of category cards with icons, names, and descriptions.

### ProductCard
Reusable product card component with:
- Product image
- Badges (24/7, category, availability)
- Title and short description
- Price display
- Action buttons (Broneeri, Vaata detaile)

### FiltersPanel
Mobile-friendly filter drawer (Sheet) with:
- Price range filter
- Rental unit filter (hour/day)
- Tags filter (checkboxes)
- Availability filter
- Location filter (if multiple lockers)

### SortBar
Top bar with:
- Search input
- Sort dropdown (Popular, Price asc/desc, Newest)
- Mobile filter button

### Pagination
SEO-friendly pagination component with page numbers and prev/next buttons.

### SkeletonGrid
Loading state skeleton grid for products.

## Usage

All components are designed to work with the Next.js App Router and use Server Components where possible. Client-side interactivity uses "use client" directive.

## Styling

Components use Rentbox brand CSS variables:
- `--bg`, `--card`, `--text`, `--muted`, `--border`
- `--accent`, `--accent-hover`, `--accent-foreground`
- `--disabled`, `--error`
