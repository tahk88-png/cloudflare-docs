import { PrismaClient } from '@prisma/client'
import { cache } from 'react'

const prisma = new PrismaClient()

export type Category = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  order: number
  active: boolean
  _count?: {
    products: number
  }
}

export type Product = {
  id: string
  slug: string
  name: string
  shortDescription: string
  description: string
  categoryId: string
  tags: string[]
  basePrice: number
  priceUnit: 'hour' | 'day'
  images: string[]
  active: boolean
  featured: boolean
  category?: Category
  compartmentCount?: number
}

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable'

export type ProductFilters = {
  categorySlug?: string
  search?: string
  priceRanges?: string[] // ['0-15', '15-30', '30+']
  units?: string[] // ['hour', 'day']
  tags?: string[]
  availability?: AvailabilityStatus[]
  page?: number
  limit?: number
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'newest'
}

// Parse JSON fields safely
function parseJSON<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// Get availability status based on compartment count
export function getAvailabilityStatus(count: number): AvailabilityStatus {
  if (count === 0) return 'unavailable'
  if (count === 1) return 'limited'
  return 'available'
}

// Get all active categories (cached)
export const getCategories = cache(async () => {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  return categories
})

// Get single category by slug (cached)
export const getCategoryBySlug = cache(async (slug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug, active: true },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  return category
})

// Get products with filters
export async function getProducts(filters: ProductFilters = {}) {
  const {
    categorySlug,
    search,
    priceRanges = [],
    units = [],
    tags = [],
    availability = [],
    page = 1,
    limit = 12,
    sort = 'popular',
  } = filters

  // Build where clause
  const where: any = {
    active: true,
  }

  // Category filter
  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug)
    if (category) {
      where.categoryId = category.id
    } else {
      return { products: [], total: 0, pages: 0 }
    }
  }

  // Search filter
  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Unit filter
  if (units.length > 0) {
    where.priceUnit = { in: units }
  }

  // Get products with compartment counts
  const productsQuery = prisma.product.findMany({
    where,
    include: {
      category: true,
      _count: {
        select: {
          compartments: {
            where: { active: true },
          },
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: getSortOrder(sort),
  })

  const countQuery = prisma.product.count({ where })

  const [rawProducts, total] = await Promise.all([productsQuery, countQuery])

  // Post-process products for client-side filters
  let products = rawProducts.map((p) => ({
    ...p,
    tags: parseJSON<string[]>(p.tags, []),
    images: parseJSON<string[]>(p.images, []),
    priceUnit: p.priceUnit as 'hour' | 'day',
    compartmentCount: p._count.compartments,
  }))

  // Apply client-side filters
  if (tags.length > 0) {
    products = products.filter((p) =>
      tags.some((tag) => p.tags.includes(tag))
    )
  }

  if (priceRanges.length > 0) {
    products = products.filter((p) => {
      return priceRanges.some((range) => {
        if (range === '0-15') return p.basePrice <= 15
        if (range === '15-30') return p.basePrice > 15 && p.basePrice <= 30
        if (range === '30+') return p.basePrice > 30
        return false
      })
    })
  }

  if (availability.length > 0) {
    products = products.filter((p) => {
      const status = getAvailabilityStatus(p.compartmentCount)
      return availability.includes(status)
    })
  }

  const filteredTotal = products.length
  const pages = Math.ceil(filteredTotal / limit)

  return {
    products,
    total: filteredTotal,
    pages,
  }
}

// Get single product by slug (cached)
export const getProductBySlug = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug, active: true },
    include: {
      category: true,
      compartments: {
        where: { active: true },
        include: {
          locker: true,
        },
      },
    },
  })

  if (!product) return null

  return {
    ...product,
    tags: parseJSON<string[]>(product.tags, []),
    images: parseJSON<string[]>(product.images, []),
    priceUnit: product.priceUnit as 'hour' | 'day',
    compartmentCount: product.compartments.length,
  }
})

// Get featured products (cached)
export const getFeaturedProducts = cache(async (limit = 6) => {
  const products = await prisma.product.findMany({
    where: { active: true, featured: true },
    include: {
      category: true,
      _count: {
        select: {
          compartments: {
            where: { active: true },
          },
        },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  return products.map((p) => ({
    ...p,
    tags: parseJSON<string[]>(p.tags, []),
    images: parseJSON<string[]>(p.images, []),
    priceUnit: p.priceUnit as 'hour' | 'day',
    compartmentCount: p._count.compartments,
  }))
})

// Get all unique tags from active products
export const getAllTags = cache(async () => {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { tags: true },
  })

  const tagSet = new Set<string>()
  products.forEach((p) => {
    const tags = parseJSON<string[]>(p.tags, [])
    tags.forEach((tag) => tagSet.add(tag))
  })

  return Array.from(tagSet).sort()
})

// Helper: Get sort order for Prisma query
function getSortOrder(sort: ProductFilters['sort']) {
  switch (sort) {
    case 'price-asc':
      return { basePrice: 'asc' as const }
    case 'price-desc':
      return { basePrice: 'desc' as const }
    case 'newest':
      return { createdAt: 'desc' as const }
    case 'popular':
    default:
      return { featured: 'desc' as const, createdAt: 'desc' as const }
  }
}
