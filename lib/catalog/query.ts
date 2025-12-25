export function parseSearchParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : undefined
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const price = typeof searchParams.price === 'string' ? searchParams.price : undefined // e.g. "0-15"
  const unit = typeof searchParams.unit === 'string' ? searchParams.unit : undefined
  const tags = typeof searchParams.tags === 'string' ? searchParams.tags.split(',') : undefined
  const availability = typeof searchParams.availability === 'string' ? searchParams.availability : 'all'

  let minPrice: number | undefined
  let maxPrice: number | undefined

  if (price) {
    if (price.includes('+')) {
      minPrice = parseInt(price.replace('+', ''))
    } else {
      const parts = price.split('-')
      if (parts.length === 2) {
        minPrice = parseInt(parts[0])
        maxPrice = parseInt(parts[1])
      }
    }
  }

  return {
    page,
    sort,
    q,
    minPrice,
    maxPrice,
    unit: unit as 'hour' | 'day' | undefined,
    tags,
    availability: availability as 'all' | 'available' | 'limited'
  }
}
