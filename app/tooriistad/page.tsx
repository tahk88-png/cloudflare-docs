import { getCategories, getFeaturedProducts } from '@/lib/catalog/data'
import { CategoryGrid } from '@/components/catalog/CategoryGrid'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Tööriistad | Rentbox.ee',
  description: 'Tööriistad 24/7. Rendi ainult siis, kui vaja.'
}

export default async function ToolsPage() {
  const categories = await getCategories()
  const featuredProducts = await getFeaturedProducts()

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12 bg-white rounded-2xl shadow-sm border border-[var(--border)]">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text)]">
          Tööriistad 24/7. <br />
          <span className="text-[var(--accent)]">Rendi ainult siis, kui vaja.</span>
        </h1>
        <div className="max-w-xl mx-auto flex gap-2">
            <Input placeholder="Otsi tööriista..." className="h-12 text-lg" />
            <Button size="lg" className="h-12 px-8">Otsi</Button>
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Kategooriad</h2>
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured Products */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Populaarsed tööriistad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </section>
    </div>
  )
}
