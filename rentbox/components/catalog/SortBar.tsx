'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { parseFilters, updateFilter, serializeFilters } from '@/lib/catalog/query'
import { useState, useEffect } from 'react'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Populaarne' },
  { value: 'price-asc', label: 'Hind: madal → kõrge' },
  { value: 'price-desc', label: 'Hind: kõrge → madal' },
  { value: 'newest', label: 'Uusimad' },
]

export function SortBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentFilters = parseFilters(searchParams)
  const [searchValue, setSearchValue] = useState(currentFilters.search || '')

  useEffect(() => {
    setSearchValue(currentFilters.search || '')
  }, [currentFilters.search])

  const updateUrl = (filters: typeof currentFilters) => {
    const params = serializeFilters(filters)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newFilters = updateFilter(currentFilters, 'search', searchValue || undefined)
    updateUrl(newFilters)
  }

  const handleSortChange = (value: string) => {
    const newFilters = updateFilter(currentFilters, 'sort', value)
    updateUrl(newFilters)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Otsi tööriistu..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </form>

      <Select
        value={currentFilters.sort || 'popular'}
        onValueChange={handleSortChange}
      >
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Sorteeri" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
