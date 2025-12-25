'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface PriceCardProps {
  basePrice: number
  priceUnit: 'hour' | 'day'
  availability: 'available' | 'limited' | 'unavailable'
}

export function PriceCard({ basePrice, priceUnit, availability }: PriceCardProps) {
  const unitLabel = priceUnit === 'hour' ? 'tund' : 'päev'

  const availabilityConfig = {
    available: {
      variant: 'success' as const,
      label: 'Saadaval',
      description: 'Võid kohe broneerida',
    },
    limited: {
      variant: 'warning' as const,
      label: 'Piiratud saadavus',
      description: 'Kiiresti läbi müüdav',
    },
    unavailable: {
      variant: 'muted' as const,
      label: 'Hetkel pole saadaval',
      description: 'Kontrolli teisi kuupäevi',
    },
  }

  const config = availabilityConfig[availability]

  return (
    <Card className="sticky top-4 bg-neutral-900 border-neutral-800">
      <CardContent className="p-6 space-y-4">
        {/* Price Display */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-neutral-400">alates</span>
            <span className="text-4xl font-bold text-white">
              {basePrice.toFixed(0)}€
            </span>
            <span className="text-neutral-400">/ {unitLabel}</span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            + käibemaks 22%
          </p>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Availability Badge */}
        <div>
          <Badge variant={config.variant} className="w-full justify-center py-2 text-sm">
            {config.label}
          </Badge>
          <p className="text-xs text-neutral-500 text-center mt-2">
            {config.description}
          </p>
        </div>

        {/* Trust Elements */}
        <div className="space-y-3 pt-2">
          <TrustItem icon="🔓" text="24/7 nutikapp" />
          <TrustItem icon="⚡" text="Kohene kasutamine" />
          <TrustItem icon="🔄" text="Lihtne tagastus" />
          <TrustItem icon="📍" text="Aespa-Kiisa, Raplamaa" />
        </div>
      </CardContent>
    </Card>
  )
}

function TrustItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-lg">{icon}</span>
      <span className="text-neutral-300">{text}</span>
    </div>
  )
}
