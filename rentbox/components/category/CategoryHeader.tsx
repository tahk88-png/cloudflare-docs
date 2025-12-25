import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface CategoryHeaderProps {
  categoryName: string
  categoryDescription: string
  categoryIcon: string
  productCount: number
}

export function CategoryHeader({
  categoryName,
  categoryDescription,
  categoryIcon,
  productCount,
}: CategoryHeaderProps) {
  return (
    <div className="bg-neutral-900 border-b border-neutral-800">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-4">
          <Link href="/" className="hover:text-accent transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/tooriistad" className="hover:text-accent transition-colors">
            Tööriistad
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white font-medium">{categoryName}</span>
        </nav>

        {/* Category Title */}
        <div className="flex items-start gap-4">
          <div className="text-4xl">{categoryIcon}</div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {categoryName}
            </h1>
            <p className="text-neutral-400 mb-3">{categoryDescription}</p>
            <div className="text-sm text-neutral-500">
              {productCount} {productCount === 1 ? 'tööriist' : 'tööriista'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
