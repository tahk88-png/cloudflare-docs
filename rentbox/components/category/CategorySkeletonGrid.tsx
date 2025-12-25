import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function CategorySkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="bg-neutral-900 border-neutral-800 overflow-hidden">
          {/* Image */}
          <Skeleton className="aspect-square w-full bg-neutral-800" />

          <CardContent className="p-4 space-y-3">
            {/* Brand */}
            <Skeleton className="h-3 w-20 bg-neutral-800" />

            {/* Title */}
            <Skeleton className="h-5 w-full bg-neutral-800" />
            <Skeleton className="h-5 w-3/4 bg-neutral-800" />

            {/* Description */}
            <Skeleton className="h-4 w-full bg-neutral-800" />
            <Skeleton className="h-4 w-5/6 bg-neutral-800" />

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-2">
              <Skeleton className="h-4 w-12 bg-neutral-800" />
              <Skeleton className="h-8 w-16 bg-neutral-800" />
              <Skeleton className="h-4 w-12 bg-neutral-800" />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-10 flex-1 bg-neutral-800" />
              <Skeleton className="h-10 flex-1 bg-neutral-800" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
