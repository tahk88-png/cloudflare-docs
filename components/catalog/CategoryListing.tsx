import { CategoryListingClient } from './CategoryListingClient'
import { getProducts, getCategoryBySlug, getLockers } from '@/lib/catalog/data'
import { parseQueryParams } from '@/lib/catalog/query'

interface CategoryListingProps {
  categorySlug: string
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function CategoryListing({ categorySlug, searchParams }: CategoryListingProps) {
  const category = await getCategoryBySlug(categorySlug)
  if (!category) return null

  // Convert searchParams object to URLSearchParams
  const urlParams = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => urlParams.append(key, String(v)))
      } else {
        urlParams.set(key, String(value))
      }
    }
  })
  const params = parseQueryParams(urlParams)
  
  // Convert price filter to range
  let priceRange: { min?: number; max?: number } | undefined
  if (params.price === '0-15') {
    priceRange = { min: 0, max: 15 }
  } else if (params.price === '15-30') {
    priceRange = { min: 15, max: 30 }
  } else if (params.price === '30+') {
    priceRange = { min: 30 }
  }

  const { products, total } = await getProducts({
    categoryId: category.id,
    search: params.q,
    priceRange,
    unit: params.unit,
    tags: params.tags,
    availability: params.availability,
    sort: params.sort || 'popular',
    page: params.page || 1,
    limit: 12,
  })

  const lockers = await getLockers()
  const totalPages = Math.ceil(total / 12)

  return (
    <CategoryListingClient
      category={category}
      products={products}
      totalPages={totalPages}
      currentPage={params.page || 1}
      lockers={lockers}
    />
  )
}
