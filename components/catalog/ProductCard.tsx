import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAvailabilityBadge } from '@/lib/catalog/data'
import type { Product, Category } from '@/lib/catalog/data'

interface ProductCardProps {
  product: Product
  category?: Category
}

export function ProductCard({ product, category }: ProductCardProps) {
  const availability = getAvailabilityBadge(product.compartmentCount || 0)
  const unitLabel = product.priceUnit === 'hour' ? 'tund' : 'päev'
  const imageUrl = product.images[0] || '/placeholder-product.jpg'

  const productUrl = `/tooriistad/${category?.slug || 'unknown'}/${product.slug}`

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--bg)]">
        <Link href={productUrl}>
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">24/7</Badge>
          {category && (
            <Badge variant="secondary" className="text-xs">
              {category.name}
            </Badge>
          )}
          <Badge variant={availability.variant} className="text-xs">
            {availability.label}
          </Badge>
        </div>
        <Link href={productUrl}>
          <h3 className="mb-2 text-lg font-semibold line-clamp-2 group-hover:text-[var(--accent)]">
            {product.name}
          </h3>
        </Link>
        {product.shortDescription && (
          <p className="mb-3 text-sm text-[var(--muted)] line-clamp-1">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-auto">
          <p className="text-lg font-semibold">
            al. {product.basePrice}€ / {unitLabel}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-4 pt-0">
        <Button asChild className="flex-1">
          <Link href={productUrl}>Broneeri</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href={productUrl}>Vaata detaile</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
