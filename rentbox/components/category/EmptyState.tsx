'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SearchX } from 'lucide-react'

interface EmptyStateProps {
  hasFilters: boolean
  onResetFilters: () => void
}

export function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <SearchX className="h-16 w-16 text-neutral-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {hasFilters ? 'Ühtegi tööriista ei leitud' : 'Selles kategoorias pole tööriistu'}
        </h3>
        <p className="text-neutral-400 mb-6 max-w-md">
          {hasFilters
            ? 'Proovi muuta filtreid või otsingut, et leida sobivaid tööriistu.'
            : 'Selles kategoorias pole hetkel ühtegi tööriista. Vaata teisi kategooriaid.'}
        </p>
        {hasFilters && (
          <Button onClick={onResetFilters} size="lg">
            Tühjenda filtrid
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
