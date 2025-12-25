import { ProductFilters } from './data'

/**
 * Parse URL search params into ProductFilters
 */
export function parseFilters(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): ProductFilters {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams as any)

  const filters: ProductFilters = {}

  // Search query
  const q = params.get('q')
  if (q) filters.search = q

  // Sort
  const sort = params.get('sort')
  if (sort && ['popular', 'price-asc', 'price-desc', 'newest'].includes(sort)) {
    filters.sort = sort as ProductFilters['sort']
  }

  // Price ranges (multiple)
  const price = params.getAll('price')
  if (price.length > 0) {
    filters.priceRanges = price
  }

  // Units (multiple)
  const unit = params.getAll('unit')
  if (unit.length > 0) {
    filters.units = unit.filter(u => ['hour', 'day'].includes(u))
  }

  // Tags (multiple)
  const tags = params.getAll('tags')
  if (tags.length > 0) {
    filters.tags = tags
  }

  // Availability (multiple)
  const availability = params.getAll('availability')
  if (availability.length > 0) {
    filters.availability = availability.filter(a => 
      ['available', 'limited', 'unavailable'].includes(a)
    ) as any
  }

  // Page
  const page = params.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) {
      filters.page = pageNum
    }
  }

  return filters
}

/**
 * Serialize ProductFilters into URL search params
 */
export function serializeFilters(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set('q', filters.search)
  if (filters.sort) params.set('sort', filters.sort)

  filters.priceRanges?.forEach(range => params.append('price', range))
  filters.units?.forEach(unit => params.append('unit', unit))
  filters.tags?.forEach(tag => params.append('tags', tag))
  filters.availability?.forEach(status => params.append('availability', status))

  if (filters.page && filters.page > 1) {
    params.set('page', filters.page.toString())
  }

  return params
}

/**
 * Build URL with filters
 */
export function buildUrl(basePath: string, filters: ProductFilters): string {
  const params = serializeFilters(filters)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/**
 * Update a single filter value
 */
export function updateFilter(
  currentFilters: ProductFilters,
  key: keyof ProductFilters,
  value: any
): ProductFilters {
  return {
    ...currentFilters,
    [key]: value,
    page: 1, // Reset to page 1 when filters change
  }
}

/**
 * Toggle a multi-value filter (for checkboxes)
 */
export function toggleFilter(
  currentFilters: ProductFilters,
  key: 'priceRanges' | 'units' | 'tags' | 'availability',
  value: string
): ProductFilters {
  const current = currentFilters[key] || []
  const updated = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value]

  return {
    ...currentFilters,
    [key]: updated.length > 0 ? updated : undefined,
    page: 1,
  }
}

/**
 * Clear all filters
 */
export function clearFilters(): ProductFilters {
  return { page: 1 }
}
