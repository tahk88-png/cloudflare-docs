'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CategoryFilters, ProductListItem, ProductsResponse, SortOption } from '@/lib/types/catalog'
import { parseQueryString, buildQueryString, countActiveFilters } from '@/lib/api/category'
import { SearchBar } from '@/components/category/SearchBar'
import { SortSelect } from '@/components/category/SortSelect'
import { FiltersSidebar } from '@/components/category/FiltersSidebar'
import { FiltersDrawer } from '@/components/category/FiltersDrawer'
import { ActiveFiltersChips } from '@/components/category/ActiveFiltersChips'
import { ProductGrid } from '@/components/category/ProductGrid'
import { EmptyState } from '@/components/category/EmptyState'
import { CategorySkeletonGrid } from '@/components/category/CategorySkeletonGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { QuickViewModal } from '@/components/category/QuickViewModal'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import Link from 'next/link'

interface CategoryPageClientProps {
  categorySlug: string
  initialData: ProductsResponse
}

export function CategoryPageClient({ categorySlug, initialData }: CategoryPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<ProductsResponse>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<ProductListItem | null>(null)

  const filters = parseQueryString(searchParams)

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const queryString = buildQueryString(filters)
        const response = await fetch(
          `/api/categories/${categorySlug}/products${queryString ? `?${queryString}` : ''}`
        )
        const newData = await response.json()
        setData(newData)
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Don't fetch on initial mount (we have initialData)
    if (searchParams.toString()) {
      fetchProducts()
    }
  }, [searchParams, categorySlug])

  const updateFilters = useCallback(
    (updates: Partial<CategoryFilters>) => {
      const newFilters = { ...filters, ...updates, page: 1 } // Reset to page 1 on filter change
      const queryString = buildQueryString(newFilters)
      router.push(`/tooriistad/${categorySlug}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      })
    },
    [filters, categorySlug, router]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const newFilters = { ...filters, page }
      const queryString = buildQueryString(newFilters)
      router.push(`/tooriistad/${categorySlug}${queryString ? `?${queryString}` : ''}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [filters, categorySlug, router]
  )

  const handleRemoveFilter = useCallback(
    (key: keyof CategoryFilters, value?: string) => {
      if (value && Array.isArray(filters[key])) {
        const updated = (filters[key] as string[]).filter((v) => v !== value)
        updateFilters({ [key]: updated.length > 0 ? updated : undefined })
      } else {
        updateFilters({ [key]: undefined })
      }
    },
    [filters, updateFilters]
  )

  const handleClearAll = useCallback(() => {
    router.push(`/tooriistad/${categorySlug}`)
  }, [categorySlug, router])

  const activeFilterCount = countActiveFilters(filters)
  const hasFilters = activeFilterCount > 0 || !!filters.search
  const totalPages = Math.ceil(data.total / data.pageSize)

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="container mx-auto px-4 py-6">
        {/* Top Bar: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              value={filters.search || ''}
              onChange={(search) => updateFilters({ search: search || undefined })}
            />
          </div>
          <div className="flex gap-2">
            {/* Mobile: Filters Button */}
            <div className="sm:hidden">
              <FiltersDrawer
                filters={filters}
                facets={data.facets}
                activeFilterCount={activeFilterCount}
                onFiltersChange={updateFilters}
                onClearAll={handleClearAll}
              />
            </div>
            <SortSelect
              value={filters.sort || 'most_available'}
              onChange={(sort) => updateFilters({ sort })}
            />
          </div>
        </div>

        {/* Active Filters Chips */}
        {hasFilters && (
          <ActiveFiltersChips
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        )}

        {/* Main Content: Sidebar + Grid */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Desktop: Filters Sidebar */}
          <aside className="hidden lg:block">
            <FiltersSidebar
              filters={filters}
              facets={data.facets}
              onFiltersChange={updateFilters}
              onClearAll={handleClearAll}
            />
          </aside>

          {/* Product Grid */}
          <main className="lg:col-span-3">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-400">
                {isLoading ? (
                  <span>Laetakse...</span>
                ) : (
                  <span>
                    Leitud {data.total} tööriista
                    {filters.search && ` päringule "${filters.search}"`}
                  </span>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && <CategorySkeletonGrid />}

            {/* Empty State */}
            {!isLoading && data.items.length === 0 && (
              <EmptyState hasFilters={hasFilters} onResetFilters={handleClearAll} />
            )}

            {/* Products */}
            {!isLoading && data.items.length > 0 && (
              <>
                <ProductGrid
                  products={data.items}
                  categorySlug={categorySlug}
                  onQuickView={setQuickViewProduct}
                />

                {/* Pagination */}
                <CategoryPagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>
        </div>

        {/* Help CTA */}
        <div className="mt-12 py-8 border-t border-neutral-800 text-center">
          <div className="flex flex-col items-center gap-4">
            <HelpCircle className="h-12 w-12 text-neutral-600" />
            <h3 className="text-xl font-semibold text-white">
              Vajad abi õige tööriista valimisel?
            </h3>
            <p className="text-neutral-400 max-w-md">
              Vaata meie KKK-d või võta meiega ühendust – aitame leida täpselt õige lahenduse.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/kkk">Vaata KKK-d</Link>
              </Button>
              <Button asChild>
                <Link href="/kontakt">Võta ühendust</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        categorySlug={categorySlug}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  )
}
