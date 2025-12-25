import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/lib/catalog/data'

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/tooriistad/${category.slug}`}
          className="group"
        >
          <Card className="h-full border-[var(--border)] bg-[var(--card)] transition-all hover:border-[var(--accent)] hover:shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 text-5xl">{category.icon}</div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight group-hover:text-[var(--accent)] transition-colors">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-sm text-[var(--muted)] leading-relaxed">
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
