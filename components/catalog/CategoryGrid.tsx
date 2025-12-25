import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/lib/catalog/data'

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/tooriistad/${category.slug}`}
          className="group"
        >
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 text-4xl">{category.icon}</div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[var(--accent)]">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-sm text-[var(--muted)]">
                  {category.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
