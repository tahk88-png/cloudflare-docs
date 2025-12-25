import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export const getCategories = cache(async () => {
  return await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: {
      products: {
        where: { active: true },
        select: { id: true }
      }
    }
  })
})

export const getCategoryBySlug = cache(async (slug: string) => {
  return await prisma.category.findUnique({
    where: { slug },
  })
})

export type ProductFilter = {
  minPrice?: number
  maxPrice?: number
  priceUnit?: 'hour' | 'day'
  tags?: string[]
  availability?: 'all' | 'available' | 'limited'
  search?: string
  sort?: string
}

export const getProductsByCategory = cache(async (categorySlug: string, filters: ProductFilter = {}) => {
  const { minPrice, maxPrice, priceUnit, tags, search, sort } = filters
  
  const where: any = {
    category: { slug: categorySlug },
    active: true
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.base_price = {}
    if (minPrice !== undefined) where.base_price.gte = minPrice
    if (maxPrice !== undefined) where.base_price.lte = maxPrice
  }

  if (priceUnit) {
    where.price_unit = priceUnit
  }

  if (tags && tags.length > 0) {
    // In SQLite/Prisma with String tags, this is tricky. 
    // We'll use 'contains' for each tag if it's stored as comma separated string
    // OR we can fetch all and filter in JS if the dataset is small (user mentioned "Avoid shipping large datasets to client" but server side filtering is preferred).
    // Let's assume tags are stored as "tag1, tag2".
    where.AND = tags.map(tag => ({
      tags: { contains: tag }
    }))
  }

  if (search) {
    where.OR = [
      { name: { contains: search } }, // SQLite is case-insensitive by default usually, or needs mode: insensitive
      { short_description: { contains: search } }
    ]
  }

  let orderBy: any = {}
  if (sort === 'price_asc') orderBy = { base_price: 'asc' }
  else if (sort === 'price_desc') orderBy = { base_price: 'desc' }
  else if (sort === 'newest') orderBy = { createdAt: 'desc' }
  // popular? We don't have popularity metric yet, maybe random or default

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      compartments: {
        where: { active: true }
      }
    }
  })

  // Post-filtering for availability if needed (complex logic) or relying on compartments count
  // Availability filter
  if (filters.availability && filters.availability !== 'all') {
    return products.filter(p => {
      const count = p.compartments.length
      if (filters.availability === 'available') return count > 0
      if (filters.availability === 'limited') return count === 1 // Simplified logic
      return true
    })
  }

  return products
})

export const getProductBySlug = cache(async (categorySlug: string, productSlug: string) => {
  return await prisma.product.findUnique({
    where: { slug: productSlug },
    include: {
      category: true,
      compartments: {
        include: {
          locker: true
        }
      }
    }
  })
})

export const getFeaturedProducts = cache(async () => {
  // Just take some products, maybe random or first 4
  return await prisma.product.findMany({
    take: 4,
    where: { active: true },
    include: {
      category: true,
      compartments: true
    }
  })
})
