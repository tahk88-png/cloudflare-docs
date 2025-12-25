import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getCategoryBySlug, getProducts, getAllTags } from '@/lib/catalog/data'
import { parseFilters } from '@/lib/catalog/query'
import { ProductCard } from '@/components/catalog/ProductCard'
import { FiltersPanel } from '@/components/catalog/FiltersPanel'
import { SortBar } from '@/components/catalog/SortBar'
import { Pagination } from '@/components/catalog/Pagination'
import { SkeletonGrid } from '@/components/catalog/SkeletonGrid'
import { Separator } from '@/components/ui/separator'

interface CategoryPageProps {
  params: { categorySlug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.categorySlug)

  if (!category) {
    return {
      title: 'Kategooriat ei leitud | Rentbox.ee',
    }
  }

  return {
    title: `${category.name} - Tööriistade rent | Rentbox.ee`,
    description: `${category.description}. Rendi ${category.name.toLowerCase()} tööriistu 24/7 nutikast kapist.`,
    keywords: [category.name, 'tööriistade rent', 'rent', 'Eesti'],
    openGraph: {
      title: `${category.name} | Rentbox.ee`,
      description: category.description,
      type: 'website',
    },
  }
}

async function ProductsGrid({ categorySlug, searchParams }: { categorySlug: string; searchParams: any }) {
  const filters = parseFilters(searchParams)
  const { products, total, pages } = await getProducts({
    ...filters,
    categorySlug,
  })

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-4">
          Selles kategoorias hetkel sobivaid tööriistu ei ole.
        </p>
        <p className="text-muted-foreground">
          <Link href="/tooriistad" className="text-accent hover:underline">
            Vaata teisi kategooriaid
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categorySlug={categorySlug}
          />
        ))}
      </div>

      <Pagination
        currentPage={filters.page || 1}
        totalPages={pages}
        total={total}
      />
    </>
  )
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = await getCategoryBySlug(params.categorySlug)

  if (!category) {
    notFound()
  }

  const allTags = await getAllTags()

  return (
    <main className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-accent transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/tooriistad" className="hover:text-accent transition-colors">
              Tööriistad
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <section className="bg-gradient-to-b from-accent/5 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className="text-4xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground text-lg mt-2">
                {category.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-4">
                <FiltersPanel availableTags={allTags} />
              </div>
            </aside>

            {/* Products */}
            <div className="flex-1">
              <div className="mb-6">
                <SortBar />
              </div>

              <Separator className="mb-6" />

              <Suspense fallback={<SkeletonGrid count={9} />}>
                <ProductsGrid 
                  categorySlug={params.categorySlug} 
                  searchParams={searchParams}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
