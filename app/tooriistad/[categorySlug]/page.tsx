import { getCategoryBySlug, getProductsByCategory } from '@/lib/catalog/data'
import { parseSearchParams } from '@/lib/catalog/query'
import { ProductCard } from '@/components/catalog/ProductCard'
import { FiltersPanel } from '@/components/catalog/FiltersPanel'
import { SortBar } from '@/components/catalog/SortBar'
import { Pagination } from '@/components/catalog/Pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props) {
  const { categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)
  if (!category) return {}
  return {
    title: `${category.name} | Rentbox.ee`,
    description: category.description
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const resolvedSearchParams = await searchParams
  
  const category = await getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const filters = parseSearchParams(resolvedSearchParams)
  const products = await getProductsByCategory(categorySlug, filters)
  
  // Simple pagination logic (slicing array for now as simplified implementation, 
  // normally would pass page/limit to DB query)
  const PAGE_SIZE = 12
  const startIndex = (filters.page - 1) * PAGE_SIZE
  const paginatedProducts = products.slice(startIndex, startIndex + PAGE_SIZE)
  const hasMore = products.length > startIndex + PAGE_SIZE

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="text-sm text-[var(--muted)] mb-6">
        <Link href="/tooriistad" className="hover:text-[var(--accent)]">Tööriistad</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-[var(--text)]">{category.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <FiltersPanel />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
               <span className="text-4xl">{category.icon}</span> 
               {category.name}
            </h1>
            <p className="text-[var(--muted)] mt-2">{category.description}</p>
          </div>

          {/* Mobile Filter Trigger & Sort */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 lg:hidden">
              {/* Mobile filter sheet would go here - simplified as simple details/summary or hidden for this MVP step */}
              <div className="p-4 border rounded-md bg-white">
                  <h3 className="font-semibold mb-2">Filtrid</h3>
                  <FiltersPanel />
              </div>
          </div>
          
          <div className="hidden lg:block">
            <SortBar />
          </div>

          {/* Product Grid */}
          {paginatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium text-[var(--text)]">Selles kategoorias hetkel sobivaid tööriistu ei ole.</h3>
              <p className="text-[var(--muted)] mt-2">Proovi muuta filtreid või vaata teisi kategooriaid.</p>
              <Button variant="outline" className="mt-4" asChild>
                  <Link href="/tooriistad">Tagasi avalehele</Link>
              </Button>
            </div>
          )}

          {/* Pagination */}
          {products.length > 0 && (
            <Pagination currentPage={filters.page} hasMore={hasMore} />
          )}
        </div>
      </div>
    </div>
  )
}
