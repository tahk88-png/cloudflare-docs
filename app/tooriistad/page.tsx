import type { Metadata } from 'next'
import { CategoryGrid } from '@/components/catalog/CategoryGrid'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getCategories, getProducts } from '@/lib/catalog/data'

export const metadata: Metadata = {
  title: 'Tööriistad - Rentbox.ee',
  description: 'Tööriistad 24/7. Rendi ainult siis, kui vaja.',
}

export default async function CatalogPage() {
  const categories = await getCategories()
  const { products: featuredProducts } = await getProducts({
    limit: 6,
    sort: 'popular',
  })

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="mb-6 text-5xl font-semibold tracking-tight md:text-6xl">
          Tööriistad 24/7
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-[var(--muted)] md:text-2xl">
          Professionaalsed tööriistad. Kohene kättesaamine.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-12">
        <form action="/tooriistad" method="get" className="mx-auto max-w-md">
          <Input
            name="q"
            type="search"
            placeholder="Otsi tööriistu..."
            className="w-full border-[var(--border)] bg-[var(--card)]"
            defaultValue=""
          />
        </form>
      </div>

      {/* Category Grid */}
      <section className="mb-20">
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">Enim kasutatud tööriistad</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => {
              const category = categories.find((c) => c.id === product.categoryId)
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  category={category}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
