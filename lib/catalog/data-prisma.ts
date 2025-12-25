// Prisma-ready data access functions
// Replace mock implementations in data.ts with these when Prisma is configured

import type { PrismaClient } from '@prisma/client'
import type { Category, Product, Locker, Compartment } from './data'

// Uncomment and use when Prisma is configured:
/*
export async function getCategoriesPrisma(prisma: PrismaClient): Promise<Category[]> {
  return await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: 'asc' }
  })
}

export async function getCategoryBySlugPrisma(
  prisma: PrismaClient,
  slug: string
): Promise<Category | null> {
  return await prisma.category.findUnique({
    where: { slug }
  })
}

export async function getProductsPrisma(
  prisma: PrismaClient,
  filters: {
    categoryId?: string
    search?: string
    priceRange?: { min?: number; max?: number }
    unit?: 'hour' | 'day'
    tags?: string[]
    availability?: 'all' | 'available' | 'limited'
    sort?: 'popular' | 'price-asc' | 'price-desc' | 'newest'
    page?: number
    limit?: number
  }
): Promise<{ products: Product[]; total: number }> {
  const where: any = {
    active: true,
  }
  
  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { shortDescription: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  
  if (filters.priceRange) {
    where.basePrice = {}
    if (filters.priceRange.min !== undefined) {
      where.basePrice.gte = filters.priceRange.min
    }
    if (filters.priceRange.max !== undefined) {
      where.basePrice.lte = filters.priceRange.max
    }
  }
  
  if (filters.unit) {
    where.priceUnit = filters.unit
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags }
  }
  
  // Calculate compartment counts for availability filtering
  const products = await prisma.product.findMany({
    where,
    include: {
      compartments: {
        where: { active: true },
        select: { id: true }
      }
    }
  })
  
  // Filter by availability
  let filtered = products
  if (filters.availability === 'available') {
    filtered = filtered.filter(p => p.compartments.length > 1)
  } else if (filters.availability === 'limited') {
    filtered = filtered.filter(p => p.compartments.length === 1)
  }
  
  // Sort
  if (filters.sort === 'price-asc') {
    filtered.sort((a, b) => a.basePrice - b.basePrice)
  } else if (filters.sort === 'price-desc') {
    filtered.sort((a, b) => b.basePrice - a.basePrice)
  } else if (filters.sort === 'newest') {
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
  
  const total = filtered.length
  const limit = filters.limit || 12
  const page = filters.page || 1
  const start = (page - 1) * limit
  
  return {
    products: filtered.slice(start, start + limit).map(p => ({
      ...p,
      compartmentCount: p.compartments.length,
      compartments: undefined,
    })) as Product[],
    total,
  }
}

export async function getProductBySlugPrisma(
  prisma: PrismaClient,
  categorySlug: string,
  productSlug: string
): Promise<Product | null> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug }
  })
  
  if (!category) return null
  
  const product = await prisma.product.findUnique({
    where: {
      categoryId_slug: {
        categoryId: category.id,
        slug: productSlug
      }
    },
    include: {
      compartments: {
        where: { active: true },
        select: { id: true }
      }
    }
  })
  
  if (!product) return null
  
  return {
    ...product,
    compartmentCount: product.compartments.length,
    compartments: undefined,
  } as Product
}

export async function getLockersPrisma(prisma: PrismaClient): Promise<Locker[]> {
  return await prisma.locker.findMany({
    orderBy: { name: 'asc' }
  })
}

export async function getCompartmentsForProductPrisma(
  prisma: PrismaClient,
  productId: string
): Promise<Compartment[]> {
  return await prisma.compartment.findMany({
    where: {
      productId,
      active: true
    },
    include: {
      locker: true
    }
  })
}
*/
