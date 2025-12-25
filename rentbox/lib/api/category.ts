import { CategoryFilters, ProductsResponse, SortOption } from '@/lib/types/catalog'

/**
 * Build URL query string from filters
 */
export function buildQueryString(filters: CategoryFilters): string {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.sort && filters.sort !== 'most_available') params.set('sort', filters.sort)
  if (filters.availableToday) params.set('available_today', 'true')
  if (filters.availableIn24h) params.set('available_in_24h', 'true')
  if (filters.selectedDate) params.set('date', filters.selectedDate)
  if (filters.brands?.length) params.set('brands', filters.brands.join(','))
  if (filters.powerTypes?.length) params.set('power_types', filters.powerTypes.join(','))
  if (filters.useCases?.length) params.set('use_cases', filters.useCases.join(','))
  if (filters.priceMin !== undefined) params.set('price_min', filters.priceMin.toString())
  if (filters.priceMax !== undefined) params.set('price_max', filters.priceMax.toString())
  if (filters.locations?.length) params.set('locations', filters.locations.join(','))
  if (filters.includesBattery) params.set('includes_battery', 'true')
  if (filters.includesCharger) params.set('includes_charger', 'true')
  if (filters.only247) params.set('only_247', 'true')
  if (filters.page && filters.page > 1) params.set('page', filters.page.toString())

  return params.toString()
}

/**
 * Parse URL query params into filters
 */
export function parseQueryString(searchParams: URLSearchParams): CategoryFilters {
  return {
    search: searchParams.get('search') || undefined,
    sort: (searchParams.get('sort') as SortOption) || 'most_available',
    availableToday: searchParams.get('available_today') === 'true',
    availableIn24h: searchParams.get('available_in_24h') === 'true',
    selectedDate: searchParams.get('date') || undefined,
    brands: searchParams.get('brands')?.split(',').filter(Boolean),
    powerTypes: searchParams.get('power_types')?.split(',').filter(Boolean) as any,
    useCases: searchParams.get('use_cases')?.split(',').filter(Boolean),
    priceMin: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined,
    priceMax: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined,
    locations: searchParams.get('locations')?.split(',').filter(Boolean),
    includesBattery: searchParams.get('includes_battery') === 'true',
    includesCharger: searchParams.get('includes_charger') === 'true',
    only247: searchParams.get('only_247') === 'true',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
  }
}

/**
 * Fetch products for category with filters
 */
export async function fetchCategoryProducts(
  categorySlug: string,
  filters: CategoryFilters
): Promise<ProductsResponse> {
  const queryString = buildQueryString(filters)
  const url = `/api/categories/${categorySlug}/products${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  return response.json()
}

/**
 * Count active filters (for mobile badge)
 */
export function countActiveFilters(filters: CategoryFilters): number {
  let count = 0

  if (filters.availableToday) count++
  if (filters.availableIn24h) count++
  if (filters.selectedDate) count++
  if (filters.brands?.length) count += filters.brands.length
  if (filters.powerTypes?.length) count += filters.powerTypes.length
  if (filters.useCases?.length) count += filters.useCases.length
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++
  if (filters.locations?.length) count += filters.locations.length
  if (filters.includesBattery) count++
  if (filters.includesCharger) count++
  if (filters.only247) count++

  return count
}

/**
 * Get human-readable sort label
 */
export function getSortLabel(sort: SortOption): string {
  const labels: Record<SortOption, string> = {
    most_available: 'Kõige kättesaadavam',
    available_today: 'Täna saadaval',
    price_asc: 'Hind: madal → kõrge',
    price_desc: 'Hind: kõrge → madal',
    popularity: 'Populaarsus',
    newest: 'Uusimad',
  }
  return labels[sort]
}
