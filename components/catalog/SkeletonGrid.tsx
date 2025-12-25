import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-[var(--border)] bg-[var(--card)]">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-6">
            <div className="mb-3 flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="mb-2 h-7 w-3/4" />
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
          <CardFooter className="flex gap-3 p-6 pt-0">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
