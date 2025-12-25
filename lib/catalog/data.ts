// Data access layer for catalog
// Adapt this to your actual database/API implementation

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  order: number
  active: boolean
}

export interface Product {
  id: string
  slug: string
  name: string
  shortDescription: string | null
  description: string | null
  categoryId: string
  tags: string[]
  basePrice: number
  priceUnit: 'hour' | 'day'
  images: string[]
  active: boolean
  compartmentCount?: number // Computed availability count
}

export interface Locker {
  id: string
  name: string
  locationText: string | null
  timezone: string
}

export interface Compartment {
  id: string
  lockerId: string
  productId: string
  label: string | null
  active: boolean
}

// Mock data for development - replace with actual Prisma queries
// In production, use Prisma Client:
// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()

const mockCategories: Category[] = [
  {
    id: '1',
    slug: 'aiatoo',
    name: 'Aiatöö',
    description: 'Muruhooldus ja õuetööd',
    icon: '🪴',
    order: 1,
    active: true,
  },
  {
    id: '2',
    slug: 'puurimine-kinnitamine',
    name: 'Puurimine & kinnitamine',
    description: 'Trellid ja kinnitustööd',
    icon: '🧰',
    order: 2,
    active: true,
  },
  {
    id: '3',
    slug: 'loikamine-saagimine',
    name: 'Lõikamine & saagimine',
    description: 'Saed ja lõiketööd',
    icon: '🪚',
    order: 3,
    active: true,
  },
  {
    id: '4',
    slug: 'lihvimine-viimistlus',
    name: 'Lihvimine & viimistlus',
    description: 'Lihv, frees, poleerimine',
    icon: '🧽',
    order: 4,
    active: true,
  },
  {
    id: '5',
    slug: 'puhastus',
    name: 'Puhastus',
    description: 'Survepesu ja tolmuvaba töö',
    icon: '🧼',
    order: 5,
    active: true,
  },
  {
    id: '6',
    slug: 'betoon-kivi',
    name: 'Betoon & kivimaterjal',
    description: 'Kivi ja betooni tööriistad',
    icon: '🧱',
    order: 6,
    active: true,
  },
  {
    id: '7',
    slug: 'moodistamine-markimine',
    name: 'Mõõdistamine & märkimine',
    description: 'Täpne mõõt ja nivoo',
    icon: '📏',
    order: 7,
    active: true,
  },
  {
    id: '8',
    slug: 'tostmine-transport',
    name: 'Tõstmine & transport',
    description: 'Liigutamine ja tõstmine',
    icon: '🛠️',
    order: 8,
    active: true,
  },
  {
    id: '9',
    slug: 'tarvikud-kulumaterjal',
    name: 'Tarvikud & kulumaterjal',
    description: 'Otsikud, kettad, akud, lisad',
    icon: '🔩',
    order: 9,
    active: true,
  },
]

const mockProducts: Product[] = [
  {
    id: '1',
    slug: 'makita-akupuur',
    name: 'Makita akupuur',
    shortDescription: 'Võimas akupuur kõigeks',
    description: 'Professionaalne Makita akupuur kõigi vajalike lisadega.',
    categoryId: '2',
    tags: ['Makita', 'puurimine', 'ehitus'],
    basePrice: 12.5,
    priceUnit: 'hour',
    images: ['/images/makita-d drill.jpg'],
    active: true,
    compartmentCount: 3,
  },
  {
    id: '2',
    slug: 'karcher-survepesur',
    name: 'Kärcher survepesur',
    shortDescription: 'Võimas survepesur',
    description: 'Kärcher survepesur kõrge survega.',
    categoryId: '5',
    tags: ['Kärcher', 'puhastus'],
    basePrice: 25.0,
    priceUnit: 'day',
    images: ['/images/karcher-pressure-washer.jpg'],
    active: true,
    compartmentCount: 2,
  },
]

export async function getCategories(): Promise<Category[]> {
  // TODO: Replace with Prisma query
  // return await prisma.category.findMany({ where: { active: true }, orderBy: { order: 'asc' } })
  return mockCategories.filter(c => c.active)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  // TODO: Replace with Prisma query
  // return await prisma.category.findUnique({ where: { slug } })
  return mockCategories.find(c => c.slug === slug) || null
}

export async function getProducts(filters: {
  categoryId?: string
  search?: string
  priceRange?: { min?: number; max?: number }
  unit?: 'hour' | 'day'
  tags?: string[]
  availability?: 'all' | 'available' | 'limited'
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'newest'
  page?: number
  limit?: number
}): Promise<{ products: Product[]; total: number }> {
  // TODO: Replace with Prisma query
  // This is a simplified mock - implement proper filtering, sorting, pagination
  let filtered = [...mockProducts]

  if (filters.categoryId) {
    filtered = filtered.filter(p => p.categoryId === filters.categoryId)
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      p => p.name.toLowerCase().includes(searchLower) ||
           p.shortDescription?.toLowerCase().includes(searchLower)
    )
  }

  if (filters.priceRange) {
    filtered = filtered.filter(p => {
      if (filters.priceRange!.min !== undefined && p.basePrice < filters.priceRange!.min) return false
      if (filters.priceRange!.max !== undefined && p.basePrice > filters.priceRange!.max) return false
      return true
    })
  }

  if (filters.unit) {
    filtered = filtered.filter(p => p.priceUnit === filters.unit)
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(p => 
      filters.tags!.some(tag => p.tags.includes(tag))
    )
  }

  if (filters.availability) {
    if (filters.availability === 'available') {
      filtered = filtered.filter(p => (p.compartmentCount || 0) > 1)
    } else if (filters.availability === 'limited') {
      filtered = filtered.filter(p => (p.compartmentCount || 0) === 1)
    }
  }

  // Sorting
  if (filters.sort === 'price-asc') {
    filtered.sort((a, b) => a.basePrice - b.basePrice)
  } else if (filters.sort === 'price-desc') {
    filtered.sort((a, b) => b.basePrice - a.basePrice)
  } else if (filters.sort === 'newest') {
    // Mock - would use createdAt in real implementation
    filtered.reverse()
  }

  const total = filtered.length
  const limit = filters.limit || 12
  const page = filters.page || 1
  const start = (page - 1) * limit
  const end = start + limit

  return {
    products: filtered.slice(start, end),
    total,
  }
}

export async function getProductBySlug(categorySlug: string, productSlug: string): Promise<Product | null> {
  // TODO: Replace with Prisma query
  // return await prisma.product.findUnique({ where: { categoryId_slug: { categoryId, slug: productSlug } }, include: { category: true } })
  const category = await getCategoryBySlug(categorySlug)
  if (!category) return null
  
  const product = mockProducts.find(p => p.slug === productSlug && p.categoryId === category.id)
  return product || null
}

export async function getLockers(): Promise<Locker[]> {
  // TODO: Replace with Prisma query
  return [
    { id: '1', name: 'Kesklinna kapp', locationText: 'Tallinn, Kesklinna', timezone: 'Europe/Tallinn' },
  ]
}

export function getAvailabilityBadge(compartmentCount: number): { label: string; variant: 'success' | 'secondary' | 'outline' } {
  if (compartmentCount > 1) {
    return { label: 'Saadaval', variant: 'success' }
  } else if (compartmentCount === 1) {
    return { label: 'Piiratud', variant: 'secondary' }
  } else {
    return { label: 'Pole hetkel', variant: 'outline' }
  }
}
