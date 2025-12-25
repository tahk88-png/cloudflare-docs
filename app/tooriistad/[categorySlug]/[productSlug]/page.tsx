import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BookingPanel } from '@/components/booking/BookingPanel'
import { getProductBySlug, getCategoryBySlug, getAvailabilityBadge, getLockers } from '@/lib/catalog/data'
import { getBookingsForProduct, getAvailableCompartments } from '@/lib/booking/data'

interface ProductPageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlug(categorySlug, productSlug)

  if (!product) {
    return {
      title: 'Tööriist ei leitud - Rentbox.ee',
    }
  }

  return {
    title: `${product.name} - Rentbox.ee`,
    description: product.shortDescription || product.description || `Rendi ${product.name} Rentbox.ee-st`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlug(categorySlug, productSlug)
  const category = await getCategoryBySlug(categorySlug)

  if (!product || !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Tööriist ei leitud</h1>
          <Link href="/tooriistad" className="text-[var(--accent)] hover:underline">
            Tagasi kataloogi
          </Link>
        </div>
      </div>
    )
  }

  // Fetch booking data
  const lockers = await getLockers()
  const compartments = await getAvailableCompartments(product.id, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  const startDate = new Date()
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
  const existingBookings = await getBookingsForProduct(product.id, startDate, endDate)

  const availability = getAvailabilityBadge(product.compartmentCount || 0)
  const unitLabel = product.priceUnit === 'hour' ? 'tund' : 'päev'
  const imageUrl = product.images[0] || '/placeholder-product.jpg'

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      {/* Breadcrumbs */}
      <nav className="mb-8 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/tooriistad" className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
              Tööriistad
            </Link>
          </li>
          <li className="text-[var(--muted)]">/</li>
          <li>
            <Link
              href={`/tooriistad/${category.slug}`}
              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              {category.name}
            </Link>
          </li>
          <li className="text-[var(--muted)]">/</li>
          <li className="font-medium text-[var(--text)]">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Column - Image Gallery */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--bg)]">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="font-normal">24/7</Badge>
              <Badge variant="secondary" className="font-normal">{category.name}</Badge>
              <Badge 
                variant={availability.variant} 
                className={`font-normal ${
                  availability.variant === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                  availability.variant === 'secondary' ? 'bg-[var(--bg)] text-[var(--muted)]' :
                  'bg-[var(--bg)] text-[var(--disabled)]'
                }`}
              >
                {availability.label}
              </Badge>
            </div>

            <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">{product.name}</h1>

            {product.shortDescription && (
              <p className="mb-6 text-lg text-[var(--muted)] leading-relaxed">{product.shortDescription}</p>
            )}

            <div className="mb-8">
              <p className="text-4xl font-semibold tracking-tight">
                al. {product.basePrice.toFixed(2)}€ / {unitLabel}
              </p>
            </div>
          </div>

          <Separator />

          {/* Specs */}
          {product.description && (
            <div>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Kirjeldus</h2>
              <p className="text-[var(--muted)] leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">Sildid</h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Trust Line */}
          <div className="rounded-lg bg-[var(--bg)] p-6">
            <p className="text-center text-sm font-medium text-[var(--muted)]">
              Võta kapist. Kasuta. Tagasta.
            </p>
          </div>

          {/* Booking Panel */}
          <BookingPanel
            product={product}
            compartments={compartments}
            lockers={lockers}
            existingBookings={existingBookings.map(b => ({
              id: b.id,
              compartmentId: b.compartmentId,
              startsAt: b.startsAt,
              endsAt: b.endsAt,
            }))}
          />
        </div>
      </div>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description || product.shortDescription,
            image: imageUrl,
            offers: {
              '@type': 'Offer',
              price: product.basePrice,
              priceCurrency: 'EUR',
              availability: availability.label === 'Saadaval' 
                ? 'https://schema.org/InStock'
                : 'https://schema.org/LimitedAvailability',
            },
          }),
        }}
      />
    </div>
  )
}
