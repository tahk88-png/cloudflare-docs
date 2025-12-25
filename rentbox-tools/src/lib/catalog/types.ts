// Category types
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  active: boolean;
}

// Product types
export type PriceUnit = "hour" | "day";

export type AvailabilityStatus = "available" | "limited" | "unavailable";

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  tags: string[];
  basePrice: number;
  priceUnit: PriceUnit;
  images: string[];
  specs: ProductSpec[];
  includes: string[];
  active: boolean;
  createdAt: Date;
  // Computed from compartments
  availabilityStatus: AvailabilityStatus;
  compartmentCount: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

// Locker types
export interface Locker {
  id: string;
  name: string;
  locationText: string;
  timezone: string;
}

export interface Compartment {
  id: string;
  lockerId: string;
  productId: string;
  label: string;
  active: boolean;
}

// Filter types
export type PriceBucket = "0-15" | "15-30" | "30+";

export type SortOption = "popular" | "price-asc" | "price-desc" | "newest";

export interface CatalogFilters {
  query?: string;
  sort?: SortOption;
  priceBucket?: PriceBucket;
  priceUnit?: PriceUnit;
  tags?: string[];
  availability?: "all" | "available" | "limited";
  locationId?: string;
  page?: number;
}

// Response types
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryWithProductCount extends Category {
  productCount: number;
}
