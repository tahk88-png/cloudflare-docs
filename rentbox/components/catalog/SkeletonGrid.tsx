import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonGridProps {
  count?: number
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardContent>
          <CardFooter className="p-4 pt-0 gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function CategorySkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 text-center space-y-3">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
