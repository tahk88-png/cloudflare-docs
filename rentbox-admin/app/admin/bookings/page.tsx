import { Suspense } from 'react';
import { BookingsTable } from '@/components/admin/bookings/BookingsTable';
import { BookingFilters } from '@/components/admin/bookings/BookingFilters';
import { CreateBookingDialog } from '@/components/admin/bookings/CreateBookingDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage all rental bookings
          </p>
        </div>
        <CreateBookingDialog />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <BookingsTable />
      </Suspense>
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  );
}
