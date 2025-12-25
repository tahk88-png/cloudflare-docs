// Catalog types for category listing page

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable'
export type PowerType = 'battery' | 'corded' | 'petrol' | 'manual'
export type SortOption = 
  | 'most_available' 
  | 'available_today' 
  | 'price_asc' 
  | 'price_desc' 
  | 'popularity' 
  | 'newest'

export interface ProductListItem {
  id: string
  slug: string
  name: string
  shortDescription: string
  imageUrl: string
  priceHour: number | null
  priceDay: number
  deposit: number
  availabilityStatus: AvailabilityStatus
  nextAvailableAt: string | null
  is247: boolean
  brand: string
  powerType: PowerType
  useCases: string[]
  locationTags: string[]
}

export interface ProductsResponse {
  items: ProductListItem[]
  total: number
  page: number
  pageSize: number
  facets: {
    brands: FacetValue[]
    powerTypes: FacetValue[]
    useCases: FacetValue[]
    priceMin: number
    priceMax: number
    locations: FacetValue[]
  }
}

export interface FacetValue {
  value: string
  count: number
}

export interface CategoryFilters {
  search?: string
  sort?: SortOption
  availableToday?: boolean
  availableIn24h?: boolean
  selectedDate?: string
  brands?: string[]
  powerTypes?: PowerType[]
  useCases?: string[]
  priceMin?: number
  priceMax?: number
  locations?: string[]
  includesBattery?: boolean
  includesCharger?: boolean
  only247?: boolean
  page?: number
}

export interface CategoryData {
  slug: string
  name: string
  description: string
  icon: string
  productCount: number
}
