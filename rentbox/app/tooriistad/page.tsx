import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { getCategories, getFeaturedProducts } from '@/lib/catalog/data'
import { CategoryGrid } from '@/components/catalog/CategoryGrid'
import { ProductCard } from '@/components/catalog/ProductCard'
import { CategorySkeletonGrid, SkeletonGrid } from '@/components/catalog/SkeletonGrid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Tööriistad 24/7 | Rentbox.ee',
  description: 'Rendi tööriistad ainult siis, kui vaja. 24/7 juurdepääs nutikast kapist. Muruniitjad, puurid, saed, lihvijad ja palju muud.',
  keywords: ['tööriistade rent', 'tööriist', 'rent', '24/7', 'Eesti', 'Tallinn'],
  openGraph: {
    title: 'Tööriistad 24/7 | Rentbox.ee',
    description: 'Rendi tööriistad ainult siis, kui vaja.',
    type: 'website',
  },
}

async function CategoriesSection() {
  const categories = await getCategories()

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Kategooriad</h2>
        <CategoryGrid categories={categories} />
      </div>
    </section>
  )
}

async function FeaturedSection() {
  const products = await getFeaturedProducts(6)

  if (products.length === 0) return null

  return (
    <section className="py-12 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Populaarsed tööriistad</h2>
          <Button variant="link" asChild>
            <Link href="/tooriistad/puurimine-kinnitamine">
              Vaata kõiki →
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categorySlug={product.category?.slug || ''}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ToolsCatalogPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-accent/5 to-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Tööriistad 24/7
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Rendi ainult siis, kui vaja
            </p>

            {/* Global Search */}
            <form action="/tooriistad/puurimine-kinnitamine" className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  placeholder="Otsi tööriistu: trell, saag, lihvija..."
                  className="pl-12 h-14 text-lg"
                />
              </div>
            </form>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>24/7 nutikapp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>Tunni- või päevapõhiselt</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>Võta ja tagasta koheselt</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <Suspense fallback={
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Kategooriad</h2>
            <CategorySkeletonGrid count={9} />
          </div>
        </section>
      }>
        <CategoriesSection />
      </Suspense>

      {/* Featured Products Section */}
      <Suspense fallback={
        <section className="py-12 bg-card/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Populaarsed tööriistad</h2>
            <SkeletonGrid count={6} />
          </div>
        </section>
      }>
        <FeaturedSection />
      </Suspense>

      {/* CTA Section */}
      <section className="py-16 bg-accent/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Alusta kohe</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Võta kapist, kasuta, tagasta. Renditasu makstakse ainult kasutatud aja eest.
          </p>
          <Button size="lg" asChild>
            <Link href="/tooriistad/puurimine-kinnitamine">
              Sirvi tööriistu
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
