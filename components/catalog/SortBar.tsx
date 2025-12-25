"use client"

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { parseQueryParams, buildQueryString, type CatalogQueryParams } from '@/lib/catalog/query'

interface SortBarProps {
  onFilterOpen?: () => void
}

export function SortBar({ onFilterOpen }: SortBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const params = parseQueryParams(searchParams)

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('q') as string
    const newParams: CatalogQueryParams = { ...params, q: query || undefined, page: undefined }
    const queryString = buildQueryString(newParams)
    router.push(`${pathname}${queryString}`)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value as CatalogQueryParams['sort']
    const newParams: CatalogQueryParams = { ...params, sort, page: undefined }
    const queryString = buildQueryString(newParams)
    router.push(`${pathname}${queryString}`)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <form onSubmit={handleSearch} className="flex-1">
        <Input
          name="q"
          type="search"
          placeholder="Otsi tööriistu..."
          defaultValue={params.q}
          className="max-w-md"
        />
      </form>

      <div className="flex items-center gap-2">
        <Select
          value={params.sort || 'popular'}
          onChange={handleSortChange}
          className="w-full md:w-auto"
        >
          <option value="popular">Populaarsed</option>
          <option value="price-asc">Hind: madal → kõrge</option>
          <option value="price-desc">Hind: kõrge → madal</option>
          <option value="newest">Uusimad</option>
        </Select>

        {onFilterOpen && (
          <Button
            type="button"
            variant="outline"
            onClick={onFilterOpen}
            className="md:hidden"
          >
            Filtrid
          </Button>
        )}
      </div>
    </div>
  )
}
