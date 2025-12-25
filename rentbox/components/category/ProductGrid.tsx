'use client'

import { ProductListItem } from '@/lib/types/catalog'
import { EnhancedProductCard } from './EnhancedProductCard'

interface ProductGridProps {
  products: ProductListItem[]
  categorySlug: string
  onQuickView?: (product: ProductListItem) => void
}

export function ProductGrid({ products, categorySlug, onQuickView }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <EnhancedProductCard
          key={product.id}
          product={product}
          categorySlug={categorySlug}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  )
}
