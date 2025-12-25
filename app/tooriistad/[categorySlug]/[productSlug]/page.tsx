import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getProductBySlug, getCategoryBySlug, getAvailabilityBadge } from '@/lib/catalog/data'

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

  const availability = getAvailabilityBadge(product.compartmentCount || 0)
  const unitLabel = product.priceUnit === 'hour' ? 'tund' : 'päev'
  const imageUrl = product.images[0] || '/placeholder-product.jpg'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/tooriistad" className="text-[var(--muted)] hover:text-[var(--accent)]">
              Tööriistad
            </Link>
          </li>
          <li className="text-[var(--muted)]">/</li>
          <li>
            <Link
              href={`/tooriistad/${category.slug}`}
              className="text-[var(--muted)] hover:text-[var(--accent)]"
            >
              {category.name}
            </Link>
          </li>
          <li className="text-[var(--muted)]">/</li>
          <li className="font-medium">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column - Image Gallery */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--bg)]">
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
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">24/7</Badge>
            <Badge variant="secondary">{category.name}</Badge>
            <Badge variant={availability.variant}>{availability.label}</Badge>
          </div>

          <h1 className="mb-4 text-3xl font-bold md:text-4xl">{product.name}</h1>

          {product.shortDescription && (
            <p className="mb-6 text-lg text-[var(--muted)]">{product.shortDescription}</p>
          )}

          <div className="mb-6">
            <p className="text-3xl font-bold">
              al. {product.basePrice}€ / {unitLabel}
            </p>
          </div>

          <div className="mb-8">
            <p className="mb-4 text-sm font-medium text-[var(--muted)]">
              Võta kapist, kasuta, tagasta.
            </p>
            <Button size="lg" className="w-full md:w-auto">
              Broneeri kohe
            </Button>
          </div>

          <Separator className="my-8" />

          {/* Specs */}
          {product.description && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Kirjeldus</h2>
              <p className="text-[var(--muted)]">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Sildid</h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Booking Panel Placeholder */}
          {/* TODO: Integrate BookingPanel component here when available */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Broneeri tööriist</h2>
              <p className="mb-4 text-sm text-[var(--muted)]">
                Vali sobiv aeg ja kapp broneerimiseks.
              </p>
              <Button className="w-full" asChild>
                <Link href={`/tooriistad/${category.slug}/${product.slug}/broneeri`}>
                  Ava broneerimisvorm
                </Link>
              </Button>
            </CardContent>
          </Card>
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
