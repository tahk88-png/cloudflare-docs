import { prisma } from '@/lib/db/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/timezone';
import { BookingStatus } from '@prisma/client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

async function getRecentBookings() {
  return prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: { name: true },
      },
      compartment: {
        select: {
          label: true,
          locker: {
            select: { name: true },
          },
        },
      },
      user: {
        select: { name: true, email: true },
      },
    },
  });
}

const statusColors = {
  [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800 border-green-200',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
  [BookingStatus.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
};

export async function RecentBookings() {
  const bookings = await getRecentBookings();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Bookings</CardTitle>
        <Link href="/admin/bookings">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{booking.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.compartment.locker.name} - {booking.compartment.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(booking.startsAt)}
                  </p>
                </div>
                <Badge className={statusColors[booking.status]} variant="outline">
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
