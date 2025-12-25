'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Eye } from 'lucide-react'
import { ProductListItem } from '@/lib/types/catalog'

interface EnhancedProductCardProps {
  product: ProductListItem
  categorySlug: string
  onQuickView?: (product: ProductListItem) => void
}

export function EnhancedProductCard({
  product,
  categorySlug,
  onQuickView,
}: EnhancedProductCardProps) {
  const [imageError, setImageError] = useState(false)

  const availabilityConfig = {
    available: {
      variant: 'success' as const,
      label: 'Saadaval kohe',
    },
    limited: {
      variant: 'warning' as const,
      label: 'Piiratud saadavus',
    },
    unavailable: {
      variant: 'muted' as const,
      label: 'Täna broneeritud',
    },
  }

  const config = availabilityConfig[product.availabilityStatus]

  // Format next available time
  const nextAvailableText = product.nextAvailableAt
    ? format(parseISO(product.nextAvailableAt), 'HH:mm')
    : null

  const productUrl = `/tooriistad/${categorySlug}/${product.slug}`

  return (
    <Card className="bg-neutral-900 border-neutral-800 overflow-hidden hover:border-accent/50 transition-all group">
      <Link href={productUrl} className="block">
        {/* Image */}
        <div className="relative aspect-square bg-neutral-800">
          <Image
            src={imageError ? '/images/placeholder-tool.jpg' : product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-2">
            {product.is247 && (
              <Badge variant="default" className="bg-accent/90 backdrop-blur-sm">
                24/7
              </Badge>
            )}
            <Badge variant={config.variant} className="backdrop-blur-sm">
              {config.label}
            </Badge>
          </div>

          {/* Quick View Button */}
          {onQuickView && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                onQuickView(product)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Link>

      <CardContent className="p-4 space-y-3">
        {/* Brand */}
        {product.brand && (
          <div className="text-xs text-neutral-400 uppercase tracking-wide">
            {product.brand}
          </div>
        )}

        {/* Title */}
        <Link href={productUrl}>
          <h3 className="font-semibold text-white group-hover:text-accent transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-neutral-400 line-clamp-2">
          {product.shortDescription}
        </p>

        {/* Next Available */}
        {product.availabilityStatus === 'unavailable' && nextAvailableText && (
          <div className="flex items-center gap-2 text-sm text-orange-400">
            <Clock className="h-4 w-4" />
            <span>Järgmine vaba: täna {nextAvailableText}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-2">
          <span className="text-sm text-neutral-400">alates</span>
          <span className="text-2xl font-bold text-white">
            {product.priceDay.toFixed(0)}€
          </span>
          <span className="text-sm text-neutral-400">/ päev</span>
        </div>

        {product.priceHour && (
          <div className="text-xs text-neutral-500">
            või {product.priceHour.toFixed(0)}€ / tund
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link href={productUrl}>Broneeri</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={productUrl}>Vaata</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
