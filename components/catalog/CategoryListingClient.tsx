"use client"

import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { FiltersPanel } from './FiltersPanel'
import { SortBar } from './SortBar'
import { Pagination } from './Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Category, Product, Locker } from '@/lib/catalog/data'

interface CategoryListingClientProps {
  category: Category
  products: Product[]
  totalPages: number
  currentPage: number
  lockers: Locker[]
}

export function CategoryListingClient({
  category,
  products,
  totalPages,
  currentPage,
  lockers,
}: CategoryListingClientProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <>
      {/* Sort Bar */}
      <div className="mb-6">
        <SortBar onFilterOpen={() => setFiltersOpen(true)} />
      </div>

      {/* Filters Panel */}
      <FiltersPanel
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        lockers={lockers.length > 1 ? lockers : undefined}
        basePath={`/tooriistad/${category.slug}`}
      />

      {/* Products Grid */}
      {products.length === 0 ? (
        <Alert>
          <AlertDescription>
            Selles kategoorias hetkel sobivaid tööriistu ei ole. Vaata teisi kategooriaid.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} category={category} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={`/tooriistad/${category.slug}`}
            />
          )}
        </>
      )}
    </>
  )
}
