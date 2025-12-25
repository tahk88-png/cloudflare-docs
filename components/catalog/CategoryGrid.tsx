import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Category } from '@prisma/client'

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => (
        <Link href={`/tooriistad/${category.slug}`} key={category.id} className="block h-full transition-transform hover:scale-105">
          <Card className="h-full flex flex-col items-center text-center hover:border-[var(--accent)] hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="text-4xl mb-2">{category.icon}</div>
              <CardTitle className="text-lg">{category.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-2">{category.description}</CardDescription>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
