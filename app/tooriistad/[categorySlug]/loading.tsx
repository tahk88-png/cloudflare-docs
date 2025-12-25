import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonGrid } from '@/components/catalog/SkeletonGrid'

export default function CategoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="mb-4 h-4 w-48" />
        <Skeleton className="mb-2 h-12 w-64" />
        <Skeleton className="h-6 w-96" />
      </div>
      <SkeletonGrid />
    </div>
  )
}
