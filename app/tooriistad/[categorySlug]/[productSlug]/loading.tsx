import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="mb-8">
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        
        <div className="space-y-8">
          <div>
            <Skeleton className="mb-4 h-6 w-32" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-6 h-6 w-3/4" />
            <Skeleton className="h-10 w-48" />
          </div>
          
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
