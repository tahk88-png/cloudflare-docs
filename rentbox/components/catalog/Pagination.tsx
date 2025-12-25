'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseFilters, updateFilter, serializeFilters } from '@/lib/catalog/query'

interface PaginationProps {
  currentPage: number
  totalPages: number
  total: number
}

export function Pagination({ currentPage, totalPages, total }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const currentFilters = parseFilters(searchParams)

  const buildPageUrl = (page: number) => {
    const newFilters = updateFilter(currentFilters, 'page', page)
    const params = serializeFilters(newFilters)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const pages: (number | 'ellipsis')[] = []
  const showEllipsis = totalPages > 7

  if (showEllipsis) {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages)
    }
  } else {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
      <p className="text-sm text-muted-foreground">
        Kokku <span className="font-medium text-foreground">{total}</span> toodet
      </p>

      <div className="flex items-center gap-2">
        {currentPage > 1 && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={buildPageUrl(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Eelmine
            </Link>
          </Button>
        )}

        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, idx) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              )
            }

            const isActive = page === currentPage

            return (
              <Button
                key={page}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                asChild={!isActive}
                disabled={isActive}
                className="w-9"
              >
                {isActive ? (
                  <span>{page}</span>
                ) : (
                  <Link href={buildPageUrl(page)}>{page}</Link>
                )}
              </Button>
            )
          })}
        </div>

        <div className="sm:hidden text-sm">
          Lehekülg {currentPage} / {totalPages}
        </div>

        {currentPage < totalPages && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={buildPageUrl(currentPage + 1)}>
              Järgmine
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
