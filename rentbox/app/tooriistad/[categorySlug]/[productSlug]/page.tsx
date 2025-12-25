import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Home, Package, Info } from 'lucide-react'
import { getProductBySlug, getCategoryBySlug } from '@/lib/catalog/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface ProductPageProps {
  params: { categorySlug: string; productSlug: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.productSlug)

  if (!product) {
    return {
      title: 'Toodet ei leitud | Rentbox.ee',
    }
  }

  return {
    title: `${product.name} - Rent | Rentbox.ee`,
    description: product.shortDescription,
    keywords: [product.name, ...product.tags, 'tööriistade rent', 'rent'],
    openGraph: {
      title: `${product.name} | Rentbox.ee`,
      description: product.shortDescription,
      type: 'website',
      images: product.images.length > 0 ? [{ url: product.images[0] }] : [],
    },
  }
}

// JSON-LD Schema for SEO
function ProductSchema({ product, category }: { product: any; category: any }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    image: product.images,
    category: category?.name,
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: 'EUR',
      availability: product.compartmentCount > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function BookingPanelPlaceholder() {
  return (
    <Card id="booking">
      <CardHeader>
        <CardTitle>Broneerimine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Broneerimise komponent tuleb siia. Integreeritakse olemasoleva Rentbox broneerimismooduliga.
          </p>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.productSlug)
  const category = await getCategoryBySlug(params.categorySlug)

  if (!product || !category) {
    notFound()
  }

  const unitLabel = product.priceUnit === 'hour' ? 'tund' : 'päev'
  const image = product.images[0] || '/images/placeholder-tool.jpg'

  // Get unique lockers from compartments
  const lockers = Array.from(
    new Set(product.compartments.map((c) => c.locker.id))
  ).map((lockerId) => 
    product.compartments.find((c) => c.locker.id === lockerId)?.locker
  ).filter(Boolean)

  return (
    <>
      <ProductSchema product={product} category={category} />

      <main className="min-h-screen bg-background">
        {/* Breadcrumbs */}
        <div className="border-b bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Link href="/" className="hover:text-accent transition-colors">
                <Home className="h-4 w-4" />
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/tooriistad" className="hover:text-accent transition-colors">
                Tööriistad
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link 
                href={`/tooriistad/${params.categorySlug}`}
                className="hover:text-accent transition-colors"
              >
                {category.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{product.name}</span>
            </nav>
          </div>
        </div>

        {/* Product Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left: Gallery */}
              <div className="space-y-4">
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/10">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>

                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-4">
                    {product.images.slice(1, 5).map((img, idx) => (
                      <div 
                        key={idx}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted/10 cursor-pointer hover:border-accent transition-colors"
                      >
                        <Image
                          src={img}
                          alt={`${product.name} ${idx + 2}`}
                          fill
                          className="object-cover"
                          sizes="25vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Product Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">24/7</Badge>
                    <Badge variant="secondary">{category.name}</Badge>
                    {product.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="muted">{tag}</Badge>
                    ))}
                  </div>

                  <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

                  <p className="text-xl text-muted-foreground mb-6">
                    {product.shortDescription}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-sm text-muted-foreground">Alates</span>
                    <span className="text-4xl font-bold text-accent">
                      {product.basePrice.toFixed(0)}€
                    </span>
                    <span className="text-lg text-muted-foreground">/ {unitLabel}</span>
                  </div>

                  {/* Trust line */}
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-center">
                      ✓ Võta kapist, kasuta, tagasta
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3 mb-6">
                    <Button size="lg" className="flex-1" asChild>
                      <a href="#booking">Broneeri kohe</a>
                    </Button>
                    <Button size="lg" variant="outline" className="flex-1" disabled>
                      Lisa soovitud
                    </Button>
                  </div>

                  <Separator />
                </div>

                {/* Description */}
                <div>
                  <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Kirjeldus
                  </h2>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {product.description}
                  </p>
                </div>

                {/* Specs/Features Placeholder */}
                <div>
                  <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Mis komplektis
                  </h2>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Seade täisvarustusel</li>
                    <li>• Kasutusjuhend</li>
                    <li>• Põhitarvikud</li>
                  </ul>
                </div>

                {/* Availability */}
                <div>
                  <h2 className="text-xl font-semibold mb-3">Saadavus</h2>
                  <div className="space-y-2">
                    {product.compartmentCount > 0 ? (
                      <Badge variant="success" className="text-sm px-3 py-1">
                        {product.compartmentCount === 1 
                          ? 'Piiratud saadavus (1 tk)' 
                          : `Saadaval (${product.compartmentCount} tk)`
                        }
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="text-sm px-3 py-1">
                        Pole hetkel saadaval
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Locations */}
                {lockers.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Asukohad</h2>
                    <div className="space-y-2">
                      {lockers.map((locker: any) => (
                        <Card key={locker.id}>
                          <CardContent className="p-4">
                            <p className="font-medium">{locker.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {locker.locationText}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Section */}
            <div className="mt-12 max-w-2xl mx-auto">
              <Suspense fallback={<BookingPanelPlaceholder />}>
                <BookingPanelPlaceholder />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
