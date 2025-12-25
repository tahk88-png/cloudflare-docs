'use client'

import { CategoryFilters, PowerType } from '@/lib/types/catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface FiltersSidebarProps {
  filters: CategoryFilters
  facets: {
    brands: { value: string; count: number }[]
    powerTypes: { value: string; count: number }[]
    useCases: { value: string; count: number }[]
    priceMin: number
    priceMax: number
    locations: { value: string; count: number }[]
  }
  onFiltersChange: (filters: Partial<CategoryFilters>) => void
  onClearAll: () => void
}

export function FiltersSidebar({
  filters,
  facets,
  onFiltersChange,
  onClearAll,
}: FiltersSidebarProps) {
  const toggleArrayFilter = (key: keyof CategoryFilters, value: string) => {
    const current = (filters[key] as string[]) || []
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onFiltersChange({ [key]: updated.length > 0 ? updated : undefined })
  }

  const priceRange = [
    filters.priceMin ?? facets.priceMin,
    filters.priceMax ?? facets.priceMax,
  ]

  return (
    <Card className="bg-neutral-900 border-neutral-800 sticky top-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-white">Filtrid</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-accent">
          Tühjenda
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" defaultValue={['availability', 'brand', 'power']} className="space-y-2">
          {/* Availability */}
          <AccordionItem value="availability" className="border-neutral-800">
            <AccordionTrigger className="text-neutral-200 hover:text-white">
              Saadavus
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-today"
                  checked={filters.availableToday}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ availableToday: checked as boolean })
                  }
                />
                <Label htmlFor="available-today" className="text-sm text-neutral-300">
                  Saadaval täna
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-24h"
                  checked={filters.availableIn24h}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ availableIn24h: checked as boolean })
                  }
                />
                <Label htmlFor="available-24h" className="text-sm text-neutral-300">
                  Vaba 24h jooksul
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="only-247"
                  checked={filters.only247}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ only247: checked as boolean })
                  }
                />
                <Label htmlFor="only-247" className="text-sm text-neutral-300">
                  Ainult 24/7
                </Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Brands */}
          {facets.brands.length > 0 && (
            <AccordionItem value="brand" className="border-neutral-800">
              <AccordionTrigger className="text-neutral-200 hover:text-white">
                Bränd
              </AccordionTrigger>
              <AccordionContent className="space-y-3 max-h-[200px] overflow-y-auto">
                {facets.brands.map(({ value, count }) => (
                  <div key={value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Checkbox
                        id={`brand-${value}`}
                        checked={filters.brands?.includes(value)}
                        onCheckedChange={() => toggleArrayFilter('brands', value)}
                      />
                      <Label
                        htmlFor={`brand-${value}`}
                        className="text-sm text-neutral-300 flex-1"
                      >
                        {value}
                      </Label>
                    </div>
                    <span className="text-xs text-neutral-500">({count})</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Power Type */}
          {facets.powerTypes.length > 0 && (
            <AccordionItem value="power" className="border-neutral-800">
              <AccordionTrigger className="text-neutral-200 hover:text-white">
                Toiteallikas
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                {facets.powerTypes.map(({ value, count }) => (
                  <div key={value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Checkbox
                        id={`power-${value}`}
                        checked={filters.powerTypes?.includes(value as PowerType)}
                        onCheckedChange={() => toggleArrayFilter('powerTypes', value)}
                      />
                      <Label
                        htmlFor={`power-${value}`}
                        className="text-sm text-neutral-300 flex-1"
                      >
                        {getPowerTypeLabel(value as PowerType)}
                      </Label>
                    </div>
                    <span className="text-xs text-neutral-500">({count})</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Use Cases */}
          {facets.useCases.length > 0 && (
            <AccordionItem value="usecase" className="border-neutral-800">
              <AccordionTrigger className="text-neutral-200 hover:text-white">
                Kasutus
              </AccordionTrigger>
              <AccordionContent className="space-y-3 max-h-[200px] overflow-y-auto">
                {facets.useCases.map(({ value, count }) => (
                  <div key={value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Checkbox
                        id={`usecase-${value}`}
                        checked={filters.useCases?.includes(value)}
                        onCheckedChange={() => toggleArrayFilter('useCases', value)}
                      />
                      <Label
                        htmlFor={`usecase-${value}`}
                        className="text-sm text-neutral-300 flex-1"
                      >
                        {value}
                      </Label>
                    </div>
                    <span className="text-xs text-neutral-500">({count})</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Price Range */}
          <AccordionItem value="price" className="border-neutral-800">
            <AccordionTrigger className="text-neutral-200 hover:text-white">
              Hind päevas
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <Slider
                min={facets.priceMin}
                max={facets.priceMax}
                step={5}
                value={priceRange}
                onValueChange={([min, max]) =>
                  onFiltersChange({ priceMin: min, priceMax: max })
                }
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-neutral-400">
                <span>{priceRange[0]}€</span>
                <span>{priceRange[1]}€</span>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Extras */}
          <AccordionItem value="extras" className="border-neutral-800">
            <AccordionTrigger className="text-neutral-200 hover:text-white">
              Lisad
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includes-battery"
                  checked={filters.includesBattery}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ includesBattery: checked as boolean })
                  }
                />
                <Label htmlFor="includes-battery" className="text-sm text-neutral-300">
                  Sisaldab akut
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includes-charger"
                  checked={filters.includesCharger}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ includesCharger: checked as boolean })
                  }
                />
                <Label htmlFor="includes-charger" className="text-sm text-neutral-300">
                  Sisaldab laadijat
                </Label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

function getPowerTypeLabel(type: PowerType): string {
  const labels: Record<PowerType, string> = {
    battery: 'Aku',
    corded: 'Elekter',
    petrol: 'Bensiin',
    manual: 'Käsitsi',
  }
  return labels[type]
}
