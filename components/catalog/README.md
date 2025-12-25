# Rentbox Catalog Components

This directory contains components for the Rentbox.ee Tools Catalog.

## Components

- **CategoryGrid**: Displays grid of categories on main page.
- **ProductCard**: Reusable card for product listing.
- **FiltersPanel**: Sidebar filter controls.
- **SortBar**: Sorting and result count.
- **Pagination**: Simple page navigation.
- **SkeletonGrid**: Loading state for product grid.

## Data Fetching

Data access is handled via `lib/catalog/data.ts` using cached Prisma queries.
Query parameters are parsed via `lib/catalog/query.ts`.

## Styling

Uses TailwindCSS with custom CSS variables defined in `app/globals.css` matching Rentbox brand.
UI components are simplified versions of shadcn/ui.
