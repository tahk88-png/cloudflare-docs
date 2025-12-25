'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function FiltersPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State from URL
  const [minPrice, setMinPrice] = useState(searchParams.get('price')?.split('-')[0] || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('price')?.split('-')[1] || '')
  const [unit, setUnit] = useState(searchParams.get('unit') || '')
  
  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (minPrice || maxPrice) {
       params.set('price', `${minPrice || 0}-${maxPrice || ''}`)
    } else {
       params.delete('price')
    }

    if (unit) {
        params.set('unit', unit)
    } else {
        params.delete('unit')
    }
    
    // Reset page on filter change
    params.set('page', '1')

    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
      setMinPrice('')
      setMaxPrice('')
      setUnit('')
      router.push('?')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Hind (€)</h3>
        <div className="flex items-center gap-2">
            <Input 
                type="number" 
                placeholder="0" 
                value={minPrice} 
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-20"
            />
            <span>-</span>
            <Input 
                type="number" 
                placeholder="Max" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20"
            />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-[var(--accent)] hover:text-white" onClick={() => { setMinPrice('0'); setMaxPrice('15'); }}>0-15€</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-[var(--accent)] hover:text-white" onClick={() => { setMinPrice('15'); setMaxPrice('30'); }}>15-30€</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-[var(--accent)] hover:text-white" onClick={() => { setMinPrice('30'); setMaxPrice(''); }}>30€+</Badge>
        </div>
      </div>
      
      <Separator />

      <div>
        <h3 className="font-semibold mb-3">Rendiperiood</h3>
        <div className="flex gap-2">
            <Button 
                variant={unit === 'hour' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setUnit(unit === 'hour' ? '' : 'hour')}
            >
                Tund
            </Button>
            <Button 
                variant={unit === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setUnit(unit === 'day' ? '' : 'day')}
            >
                Päev
            </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
          <Button onClick={handleApply} className="w-full">Rakenda filtrid</Button>
          <Button variant="ghost" onClick={clearFilters} className="w-full">Tühjenda</Button>
      </div>
    </div>
  )
}
