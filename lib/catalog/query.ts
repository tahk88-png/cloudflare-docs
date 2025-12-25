export interface CatalogQueryParams {
  q?: string
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'newest'
  price?: string // '0-15' | '15-30' | '30+'
  unit?: 'hour' | 'day'
  tags?: string[]
  availability?: 'all' | 'available' | 'limited'
  location?: string
  page?: number
}

export function parseQueryParams(searchParams: URLSearchParams): CatalogQueryParams {
  const params: CatalogQueryParams = {}
  
  const q = searchParams.get('q')
  if (q) params.q = q

  const sort = searchParams.get('sort')
  if (sort && ['popular', 'price-asc', 'price-desc', 'newest'].includes(sort)) {
    params.sort = sort as CatalogQueryParams['sort']
  }

  const price = searchParams.get('price')
  if (price && ['0-15', '15-30', '30+'].includes(price)) {
    params.price = price
  }

  const unit = searchParams.get('unit')
  if (unit && ['hour', 'day'].includes(unit)) {
    params.unit = unit as 'hour' | 'day'
  }

  const tags = searchParams.get('tags')
  if (tags) {
    params.tags = tags.split(',').filter(Boolean)
  }

  const availability = searchParams.get('availability')
  if (availability && ['all', 'available', 'limited'].includes(availability)) {
    params.availability = availability as CatalogQueryParams['availability']
  }

  const location = searchParams.get('location')
  if (location) params.location = location

  const page = searchParams.get('page')
  if (page) {
    const pageNum = parseInt(page, 10)
    if (!isNaN(pageNum) && pageNum > 0) {
      params.page = pageNum
    }
  }

  return params
}

export function serializeQueryParams(params: CatalogQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params.q) searchParams.set('q', params.q)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.price) searchParams.set('price', params.price)
  if (params.unit) searchParams.set('unit', params.unit)
  if (params.tags && params.tags.length > 0) {
    searchParams.set('tags', params.tags.join(','))
  }
  if (params.availability && params.availability !== 'all') {
    searchParams.set('availability', params.availability)
  }
  if (params.location) searchParams.set('location', params.location)
  if (params.page && params.page > 1) {
    searchParams.set('page', params.page.toString())
  }

  return searchParams
}

export function buildQueryString(params: CatalogQueryParams): string {
  const searchParams = serializeQueryParams(params)
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
