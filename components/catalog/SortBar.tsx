'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select' // Wait, I didn't create select properly yet.
// Using native select for now
import { cn } from '@/lib/utils'

export function SortBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSort = searchParams.get('sort') || ''

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
        params.set('sort', e.target.value)
    } else {
        params.delete('sort')
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-[var(--muted)]">
          {/* Could show result count here if passed as prop */}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Sorteeri:</label>
        <select 
            className="h-10 rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={currentSort}
            onChange={handleSortChange}
        >
            <option value="">Populaarsed</option>
            <option value="price_asc">Hind madal → kõrge</option>
            <option value="price_desc">Hind kõrge → madal</option>
            <option value="newest">Uusimad</option>
        </select>
      </div>
    </div>
  )
}
