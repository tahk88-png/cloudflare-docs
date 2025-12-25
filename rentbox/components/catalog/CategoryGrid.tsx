import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Category } from '@/lib/catalog/data'

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => (
        <Link key={category.id} href={`/tooriistad/${category.slug}`}>
          <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-accent/30 cursor-pointer">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-5xl transition-transform group-hover:scale-110">
                {category.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-accent transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {category.description}
                </p>
              </div>
              {category._count && (
                <p className="text-xs text-muted-foreground">
                  {category._count.products} toodet
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
