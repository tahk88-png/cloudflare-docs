'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  hasMore: boolean
}

export function Pagination({ currentPage, hasMore }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex justify-center gap-2 mt-8">
      <Button 
        variant="outline" 
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Eelmine
      </Button>
      <div className="flex items-center px-4 font-medium">
          Lk {currentPage}
      </div>
      <Button 
        variant="outline" 
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasMore}
      >
        Järgmine
      </Button>
    </div>
  )
}
