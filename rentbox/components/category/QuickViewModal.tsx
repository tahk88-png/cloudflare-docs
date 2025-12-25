'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProductListItem } from '@/lib/types/catalog'
import { Clock, ExternalLink } from 'lucide-react'

interface QuickViewModalProps {
  product: ProductListItem | null
  categorySlug: string
  isOpen: boolean
  onClose: () => void
}

export function QuickViewModal({
  product,
  categorySlug,
  isOpen,
  onClose,
}: QuickViewModalProps) {
  const [imageError, setImageError] = useState(false)

  if (!product) return null

  const availabilityConfig = {
    available: {
      variant: 'success' as const,
      label: 'Saadaval kohe',
      description: 'Võid kohe broneerida',
    },
    limited: {
      variant: 'warning' as const,
      label: 'Piiratud saadavus',
      description: 'Kiiresti läbi müüdav',
    },
    unavailable: {
      variant: 'muted' as const,
      label: 'Täna broneeritud',
      description: 'Vaata järgmist vaba aega',
    },
  }

  const config = availabilityConfig[product.availabilityStatus]
  const nextAvailableText = product.nextAvailableAt
    ? format(parseISO(product.nextAvailableAt), "dd.MM 'kell' HH:mm")
    : null

  const productUrl = `/tooriistad/${categorySlug}/${product.slug}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">Kiirvaade</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative aspect-square bg-neutral-800 rounded-lg overflow-hidden">
            <Image
              src={imageError ? '/images/placeholder-tool.jpg' : product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {product.is247 && (
              <Badge variant="default" className="absolute top-2 left-2">
                24/7
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            {/* Brand */}
            {product.brand && (
              <div className="text-sm text-neutral-400 uppercase tracking-wide">
                {product.brand}
              </div>
            )}

            {/* Title */}
            <h3 className="text-xl font-bold text-white">{product.name}</h3>

            {/* Description */}
            <p className="text-neutral-300">{product.shortDescription}</p>

            <Separator className="bg-neutral-800" />

            {/* Availability */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-400">Saadavus</h4>
              <Badge variant={config.variant} className="text-sm">
                {config.label}
              </Badge>
              <p className="text-sm text-neutral-400">{config.description}</p>

              {product.availabilityStatus === 'unavailable' && nextAvailableText && (
                <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-400/10 rounded p-3">
                  <Clock className="h-4 w-4" />
                  <span>Järgmine vaba: {nextAvailableText}</span>
                </div>
              )}
            </div>

            <Separator className="bg-neutral-800" />

            {/* Price */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-400">Hind</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {product.priceDay.toFixed(0)}€
                </span>
                <span className="text-neutral-400">/ päev</span>
              </div>
              {product.priceHour && (
                <div className="text-sm text-neutral-400">
                  või {product.priceHour.toFixed(0)}€ / tund
                </div>
              )}
            </div>

            {/* Tags */}
            {product.useCases.length > 0 && (
              <>
                <Separator className="bg-neutral-800" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-neutral-400">Kasutus</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.useCases.map((useCase) => (
                      <Badge key={useCase} variant="outline" className="text-xs">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action */}
            <div className="flex gap-2 pt-4">
              <Button asChild className="flex-1" size="lg">
                <Link href={productUrl}>
                  Ava täielik leht
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
