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
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          Tööriistad 24/7. Rendi ainult siis, kui vaja.
        </h1>
        <p className="text-lg text-[var(--muted)]">
          Leia õige tööriist oma projektile
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <form action="/tooriistad" method="get" className="flex gap-2">
          <Input
            name="q"
            type="search"
            placeholder="Otsi tööriistu..."
            className="max-w-md"
            defaultValue=""
          />
          <Button type="submit">Otsi</Button>
        </form>
      </div>

      {/* Category Grid */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold">Kategooriad</h2>
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Populaarsed tööriistad</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
