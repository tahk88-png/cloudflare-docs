'use client'

import { ArrowUpDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SortOption } from '@/lib/types/catalog'
import { getSortLabel } from '@/lib/api/category'

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

const SORT_OPTIONS: SortOption[] = [
  'most_available',
  'available_today',
  'price_asc',
  'price_desc',
  'popularity',
  'newest',
]

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-neutral-400 hidden sm:block" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] bg-neutral-800 border-neutral-700 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {getSortLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
