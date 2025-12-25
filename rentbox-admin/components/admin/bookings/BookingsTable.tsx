import { prisma } from '@/lib/db/prisma';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/timezone';
import { BookingStatus } from '@prisma/client';
import { BookingActions } from './BookingActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

async function getBookings() {
  return prisma.booking.findMany({
    take: 50,
    orderBy: { startsAt: 'desc' },
    include: {
      product: {
        select: { name: true },
      },
      compartment: {
        select: {
          label: true,
          locker: {
            select: { name: true, locationText: true },
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

export async function BookingsTable() {
  const bookings = await getBookings();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Compartment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatDateTime(booking.startsAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          to {formatDateTime(booking.endsAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {booking.product.name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{booking.compartment.locker.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.compartment.locker.locationText}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.compartment.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {booking.user ? (
                        <div className="space-y-1">
                          <div className="text-sm">{booking.user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[booking.status]} variant="outline">
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(booking.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <BookingActions booking={booking} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
