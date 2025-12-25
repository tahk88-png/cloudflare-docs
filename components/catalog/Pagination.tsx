"use client"

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { parseQueryParams, buildQueryString, type CatalogQueryParams } from '@/lib/catalog/query'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const searchParams = useSearchParams()
  const params = parseQueryParams(searchParams)

  if (totalPages <= 1) return null

  const getPageUrl = (page: number) => {
    const newParams: CatalogQueryParams = { ...params, page: page > 1 ? page : undefined }
    return `${basePath}${buildQueryString(newParams)}`
  }

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {currentPage > 1 && (
        <Button variant="outline" asChild>
          <Link href={getPageUrl(currentPage - 1)}>Eelmine</Link>
        </Button>
      )}

      {start > 1 && (
        <>
          <Button variant="outline" asChild>
            <Link href={getPageUrl(1)}>1</Link>
          </Button>
          {start > 2 && <span className="px-2 text-[var(--muted)]">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'default' : 'outline'}
          asChild
        >
          <Link href={getPageUrl(page)}>{page}</Link>
        </Button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-2 text-[var(--muted)]">...</span>}
          <Button variant="outline" asChild>
            <Link href={getPageUrl(totalPages)}>{totalPages}</Link>
          </Button>
        </>
      )}

      {currentPage < totalPages && (
        <Button variant="outline" asChild>
          <Link href={getPageUrl(currentPage + 1)}>Järgmine</Link>
        </Button>
      )}
    </nav>
  )
}
