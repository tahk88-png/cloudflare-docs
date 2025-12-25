"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { parseQueryParams, buildQueryString, type CatalogQueryParams } from '@/lib/catalog/query'

interface FiltersPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lockers?: Array<{ id: string; name: string; locationText: string | null }>
  basePath?: string
}

const AVAILABLE_TAGS = [
  'Makita',
  'Kärcher',
  'aiatöö',
  'ehitus',
  'puhastus',
  'lihvimine',
  'puurimine',
  'lõikamine',
]

export function FiltersPanel({ open, onOpenChange, lockers, basePath = '/tooriistad' }: FiltersPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = parseQueryParams(searchParams)

  const [localParams, setLocalParams] = useState<CatalogQueryParams>(params)

  const handleApply = () => {
    const queryString = buildQueryString(localParams)
    router.push(`${basePath}${queryString}`)
    onOpenChange(false)
  }

  const handleReset = () => {
    const emptyParams: CatalogQueryParams = {}
    setLocalParams(emptyParams)
    router.push(basePath)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtrid</SheetTitle>
          <SheetClose />
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Price Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Hind</label>
            <Select
              value={localParams.price || ''}
              onChange={(e) =>
                setLocalParams({ ...localParams, price: e.target.value || undefined })
              }
            >
              <option value="">Kõik hinnad</option>
              <option value="0-15">0-15€</option>
              <option value="15-30">15-30€</option>
              <option value="30+">30€+</option>
            </Select>
          </div>

          <Separator />

          {/* Unit Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Ühik</label>
            <Select
              value={localParams.unit || ''}
              onChange={(e) =>
                setLocalParams({ ...localParams, unit: e.target.value as 'hour' | 'day' | undefined })
              }
            >
              <option value="">Kõik ühikud</option>
              <option value="hour">Tund</option>
              <option value="day">Päev</option>
            </Select>
          </div>

          <Separator />

          {/* Tags Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Sildid</label>
            <div className="space-y-2">
              {AVAILABLE_TAGS.map((tag) => (
                <label key={tag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localParams.tags?.includes(tag) || false}
                    onChange={(e) => {
                      const currentTags = localParams.tags || []
                      const newTags = e.target.checked
                        ? [...currentTags, tag]
                        : currentTags.filter((t) => t !== tag)
                      setLocalParams({ ...localParams, tags: newTags.length > 0 ? newTags : undefined })
                    }}
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Availability Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">Saadavus</label>
            <Select
              value={localParams.availability || 'all'}
              onChange={(e) =>
                setLocalParams({
                  ...localParams,
                  availability: e.target.value as CatalogQueryParams['availability'],
                })
              }
            >
              <option value="all">Kõik</option>
              <option value="available">Saadaval</option>
              <option value="limited">Piiratud</option>
            </Select>
          </div>

          {lockers && lockers.length > 1 && (
            <>
              <Separator />
              <div>
                <label className="mb-2 block text-sm font-medium">Asukoht</label>
                <Select
                  value={localParams.location || ''}
                  onChange={(e) =>
                    setLocalParams({ ...localParams, location: e.target.value || undefined })
                  }
                >
                  <option value="">Kõik asukohad</option>
                  {lockers.map((locker) => (
                    <option key={locker.id} value={locker.id}>
                      {locker.locationText || locker.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleApply} className="flex-1">
              Rakenda
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Lähtesta
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
