'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProductFilters } from '@/lib/catalog/data'
import { parseFilters, toggleFilter, clearFilters, serializeFilters } from '@/lib/catalog/query'
import { X } from 'lucide-react'

interface FiltersPanelProps {
  availableTags?: string[]
  showLocationFilter?: boolean
}

const PRICE_RANGES = [
  { value: '0-15', label: '0–15€' },
  { value: '15-30', label: '15–30€' },
  { value: '30+', label: '30€+' },
]

const UNITS = [
  { value: 'hour', label: 'Tund' },
  { value: 'day', label: 'Päev' },
]

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Saadaval' },
  { value: 'limited', label: 'Piiratud' },
  { value: 'unavailable', label: 'Pole hetkel' },
]

export function FiltersPanel({ availableTags = [], showLocationFilter = false }: FiltersPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentFilters = parseFilters(searchParams)

  const updateUrl = (filters: ProductFilters) => {
    const params = serializeFilters(filters)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleToggle = (
    key: 'priceRanges' | 'units' | 'tags' | 'availability',
    value: string
  ) => {
    const newFilters = toggleFilter(currentFilters, key, value)
    updateUrl(newFilters)
  }

  const handleClearAll = () => {
    updateUrl(clearFilters())
  }

  const hasActiveFilters = 
    (currentFilters.priceRanges?.length ?? 0) > 0 ||
    (currentFilters.units?.length ?? 0) > 0 ||
    (currentFilters.tags?.length ?? 0) > 0 ||
    (currentFilters.availability?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filtrid</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Tühista
          </Button>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Hind</h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <div key={range.value} className="flex items-center space-x-2">
              <Checkbox
                id={`price-${range.value}`}
                checked={currentFilters.priceRanges?.includes(range.value)}
                onCheckedChange={() => handleToggle('priceRanges', range.value)}
              />
              <Label
                htmlFor={`price-${range.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {range.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Unit */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Ühik</h4>
        <div className="space-y-2">
          {UNITS.map((unit) => (
            <div key={unit.value} className="flex items-center space-x-2">
              <Checkbox
                id={`unit-${unit.value}`}
                checked={currentFilters.units?.includes(unit.value)}
                onCheckedChange={() => handleToggle('units', unit.value)}
              />
              <Label
                htmlFor={`unit-${unit.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {unit.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tags */}
      {availableTags.length > 0 && (
        <>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sildid</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={currentFilters.tags?.includes(tag)}
                    onCheckedChange={() => handleToggle('tags', tag)}
                  />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Availability */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Saadavus</h4>
        <div className="space-y-2">
          {AVAILABILITY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`availability-${option.value}`}
                checked={currentFilters.availability?.includes(option.value as any)}
                onCheckedChange={() => handleToggle('availability', option.value)}
              />
              <Label
                htmlFor={`availability-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
