import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-full flex flex-col">
           <Skeleton className="h-48 w-full rounded-t-lg" />
           <CardHeader className="p-4 pb-2">
               <Skeleton className="h-4 w-1/3 mb-2" />
               <Skeleton className="h-6 w-3/4" />
               <Skeleton className="h-4 w-full mt-2" />
           </CardHeader>
           <CardContent className="p-4 pt-0 grow" />
           <CardFooter className="p-4 border-t flex flex-col gap-3">
               <div className="w-full flex justify-between">
                   <Skeleton className="h-4 w-1/3" />
                   <Skeleton className="h-6 w-1/4" />
               </div>
               <div className="w-full grid grid-cols-2 gap-2">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
               </div>
           </CardFooter>
        </Card>
      ))}
    </div>
  )
}
