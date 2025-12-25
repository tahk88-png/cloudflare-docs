'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CategoryFilters } from '@/lib/types/catalog'
import { getSortLabel } from '@/lib/api/category'

interface ActiveFiltersChipsProps {
  filters: CategoryFilters
  onRemoveFilter: (key: keyof CategoryFilters, value?: string) => void
  onClearAll: () => void
}

export function ActiveFiltersChips({
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveFiltersChipsProps) {
  const chips: { label: string; onRemove: () => void }[] = []

  // Availability filters
  if (filters.availableToday) {
    chips.push({
      label: 'Saadaval täna',
      onRemove: () => onRemoveFilter('availableToday'),
    })
  }
  if (filters.availableIn24h) {
    chips.push({
      label: 'Vaba 24h jooksul',
      onRemove: () => onRemoveFilter('availableIn24h'),
    })
  }
  if (filters.only247) {
    chips.push({
      label: 'Ainult 24/7',
      onRemove: () => onRemoveFilter('only247'),
    })
  }

  // Brand filters
  filters.brands?.forEach((brand) => {
    chips.push({
      label: `Bränd: ${brand}`,
      onRemove: () => onRemoveFilter('brands', brand),
    })
  })

  // Power type filters
  filters.powerTypes?.forEach((type) => {
    chips.push({
      label: `Toiteallikas: ${type}`,
      onRemove: () => onRemoveFilter('powerTypes', type),
    })
  })

  // Use case filters
  filters.useCases?.forEach((useCase) => {
    chips.push({
      label: `Kasutus: ${useCase}`,
      onRemove: () => onRemoveFilter('useCases', useCase),
    })
  })

  // Price range
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    chips.push({
      label: `Hind: ${filters.priceMin || 0}€ - ${filters.priceMax || '∞'}€`,
      onRemove: () => {
        onRemoveFilter('priceMin')
        onRemoveFilter('priceMax')
      },
    })
  }

  // Location filters
  filters.locations?.forEach((location) => {
    chips.push({
      label: `Asukoht: ${location}`,
      onRemove: () => onRemoveFilter('locations', location),
    })
  })

  // Extras
  if (filters.includesBattery) {
    chips.push({
      label: 'Sisaldab akut',
      onRemove: () => onRemoveFilter('includesBattery'),
    })
  }
  if (filters.includesCharger) {
    chips.push({
      label: 'Sisaldab laadijat',
      onRemove: () => onRemoveFilter('includesCharger'),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <span className="text-sm text-neutral-400">Aktiivsed filtrid:</span>
      {chips.map((chip, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="gap-1 pr-1 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-1 hover:text-accent rounded-full p-0.5 hover:bg-neutral-600"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="text-accent h-7">
        Tühjenda kõik
      </Button>
    </div>
  )
}
