import { NextRequest, NextResponse } from 'next/server'
import { ProductsResponse, ProductListItem } from '@/lib/types/catalog'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse filters from query params
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'most_available'
    const availableToday = searchParams.get('available_today') === 'true'
    const availableIn24h = searchParams.get('available_in_24h') === 'true'
    const brands = searchParams.get('brands')?.split(',').filter(Boolean) || []
    const powerTypes = searchParams.get('power_types')?.split(',').filter(Boolean) || []
    const useCases = searchParams.get('use_cases')?.split(',').filter(Boolean) || []
    const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined
    const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const pageSize = 12

    // In production, this would query the database
    // For now, return mock data
    const mockProducts: ProductListItem[] = [
      {
        id: '1',
        slug: 'akutrell-makita-18v',
        name: 'Akutrell Makita 18V',
        shortDescription: 'Võimas akutrell kõikideks trellitöödeks',
        imageUrl: '/images/placeholder-tool.jpg',
        priceHour: 8,
        priceDay: 25,
        deposit: 50,
        availabilityStatus: 'available',
        nextAvailableAt: null,
        is247: true,
        brand: 'Makita',
        powerType: 'battery',
        useCases: ['Puurimine', 'Ehitus'],
        locationTags: ['Tallinn'],
      },
      {
        id: '2',
        slug: 'survepesu-karcher-k5',
        name: 'Survepesu Kärcher K5',
        shortDescription: 'Professionaalne survepesumasin',
        imageUrl: '/images/placeholder-tool.jpg',
        priceHour: null,
        priceDay: 35,
        deposit: 100,
        availabilityStatus: 'limited',
        nextAvailableAt: null,
        is247: true,
        brand: 'Kärcher',
        powerType: 'corded',
        useCases: ['Puhastus', 'Õuetööd'],
        locationTags: ['Tallinn'],
      },
      {
        id: '3',
        slug: 'kettasaag-bosch-gks-190',
        name: 'Kettasaag Bosch GKS 190',
        shortDescription: 'Käsikettasaag täpseks lõikamiseks',
        imageUrl: '/images/placeholder-tool.jpg',
        priceHour: 6,
        priceDay: 20,
        deposit: 80,
        availabilityStatus: 'unavailable',
        nextAvailableAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        is247: false,
        brand: 'Bosch',
        powerType: 'corded',
        useCases: ['Lõikamine', 'Ehitus'],
        locationTags: ['Tallinn'],
      },
    ]

    // Apply filters (simplified logic for demo)
    let filteredProducts = mockProducts.filter((product) => {
      if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (availableToday && product.availabilityStatus === 'unavailable') {
        return false
      }
      if (brands.length > 0 && !brands.includes(product.brand)) {
        return false
      }
      if (powerTypes.length > 0 && !powerTypes.includes(product.powerType)) {
        return false
      }
      if (useCases.length > 0 && !product.useCases.some((uc) => useCases.includes(uc))) {
        return false
      }
      if (priceMin !== undefined && product.priceDay < priceMin) {
        return false
      }
      if (priceMax !== undefined && product.priceDay > priceMax) {
        return false
      }
      return true
    })

    // Apply sorting
    switch (sort) {
      case 'most_available':
        filteredProducts.sort((a, b) => {
          const statusOrder = { available: 0, limited: 1, unavailable: 2 }
          return statusOrder[a.availabilityStatus] - statusOrder[b.availabilityStatus]
        })
        break
      case 'price_asc':
        filteredProducts.sort((a, b) => a.priceDay - b.priceDay)
        break
      case 'price_desc':
        filteredProducts.sort((a, b) => b.priceDay - a.priceDay)
        break
    }

    // Pagination
    const start = (page - 1) * pageSize
    const paginatedProducts = filteredProducts.slice(start, start + pageSize)

    // Build facets
    const allBrands = Array.from(new Set(mockProducts.map((p) => p.brand)))
    const allPowerTypes = Array.from(new Set(mockProducts.map((p) => p.powerType)))
    const allUseCases = Array.from(
      new Set(mockProducts.flatMap((p) => p.useCases))
    )

    const response: ProductsResponse = {
      items: paginatedProducts,
      total: filteredProducts.length,
      page,
      pageSize,
      facets: {
        brands: allBrands.map((brand) => ({
          value: brand,
          count: mockProducts.filter((p) => p.brand === brand).length,
        })),
        powerTypes: allPowerTypes.map((type) => ({
          value: type,
          count: mockProducts.filter((p) => p.powerType === type).length,
        })),
        useCases: allUseCases.map((useCase) => ({
          value: useCase,
          count: mockProducts.filter((p) => p.useCases.includes(useCase)).length,
        })),
        priceMin: Math.min(...mockProducts.map((p) => p.priceDay)),
        priceMax: Math.max(...mockProducts.map((p) => p.priceDay)),
        locations: [{ value: 'Tallinn', count: mockProducts.length }],
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Category products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
