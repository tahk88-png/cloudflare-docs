import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Product, getAvailabilityStatus } from '@/lib/catalog/data'

interface ProductCardProps {
  product: Product & { compartmentCount?: number }
  categorySlug: string
}

export function ProductCard({ product, categorySlug }: ProductCardProps) {
  const availability = getAvailabilityStatus(product.compartmentCount || 0)
  const image = product.images?.[0] || '/images/placeholder-tool.jpg'
  const unitLabel = product.priceUnit === 'hour' ? 'tund' : 'päev'

  const availabilityConfig = {
    available: { variant: 'success' as const, label: 'Saadaval' },
    limited: { variant: 'warning' as const, label: 'Piiratud' },
    unavailable: { variant: 'muted' as const, label: 'Pole hetkel' },
  }

  const { variant, label } = availabilityConfig[availability]

  return (
    <Link href={`/tooriistad/${categorySlug}/${product.slug}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-accent/30 cursor-pointer">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/10">
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-card/90 backdrop-blur-sm text-xs">
              24/7
            </Badge>
            {product.category && (
              <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-xs">
                {product.category.name}
              </Badge>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={variant} className="backdrop-blur-sm">
              {label}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-accent transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.shortDescription}
            </p>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-sm text-muted-foreground">al.</span>
            <span className="text-2xl font-bold text-accent">
              {product.basePrice.toFixed(0)}€
            </span>
            <span className="text-sm text-muted-foreground">/ {unitLabel}</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 gap-2">
          <Button 
            className="flex-1"
            onClick={(e) => {
              e.preventDefault()
              window.location.href = `/tooriistad/${categorySlug}/${product.slug}#booking`
            }}
          >
            Broneeri
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            Vaata detaile
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
