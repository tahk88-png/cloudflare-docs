import { prisma } from '@/lib/db/prisma';
import { BookingStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Package, Grid3x3, AlertTriangle } from 'lucide-react';

async function getKpis() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    todayBookingsCount,
    upcoming24hBookingsCount,
    activeProductsCount,
    activeCompartmentsCount,
    disabledCompartmentsCount,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    }),
    prisma.booking.count({
      where: {
        startsAt: { gte: now, lte: in24Hours },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    }),
    prisma.product.count({
      where: { active: true },
    }),
    prisma.compartment.count({
      where: { active: true },
    }),
    prisma.compartment.count({
      where: { active: false },
    }),
  ]);

  return {
    todayBookings: todayBookingsCount,
    upcoming24h: upcoming24hBookingsCount,
    activeProducts: activeProductsCount,
    activeCompartments: activeCompartmentsCount,
    disabledCompartments: disabledCompartmentsCount,
  };
}

export async function KpiCards() {
  const kpis = await getKpis();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.todayBookings}</div>
          <p className="text-xs text-muted-foreground">
            Active bookings today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming 24h</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.upcoming24h}</div>
          <p className="text-xs text-muted-foreground">
            Bookings in next 24 hours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.activeProducts}</div>
          <p className="text-xs text-muted-foreground">
            Available for rental
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compartments</CardTitle>
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.activeCompartments}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.disabledCompartments > 0 && (
              <span className="text-destructive">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                {kpis.disabledCompartments} disabled
              </span>
            )}
            {kpis.disabledCompartments === 0 && 'All operational'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
