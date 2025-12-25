'use client'

import { CategoryFilters } from '@/lib/types/catalog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { FiltersSidebar } from './FiltersSidebar'
import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FiltersDrawerProps {
  filters: CategoryFilters
  facets: {
    brands: { value: string; count: number }[]
    powerTypes: { value: string; count: number }[]
    useCases: { value: string; count: number }[]
    priceMin: number
    priceMax: number
    locations: { value: string; count: number }[]
  }
  activeFilterCount: numberheet
  onFiltersChange: (filters: Partial<CategoryFilters>) => void
  onClearAll: () => void
}

export function FiltersDrawer({
  filters,
  facets,
  activeFilterCount,
  onFiltersChange,
  onClearAll,
}: FiltersDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtrid
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtrid</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FiltersSidebar
            filters={filters}
            facets={facets}
            onFiltersChange={onFiltersChange}
            onClearAll={onClearAll}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
