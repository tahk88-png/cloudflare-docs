import { prisma } from '@/lib/db/prisma';
import { BookingStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

async function getAlerts() {
  // Check for booking conflicts (should be 0)
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: now, lte: in24Hours },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    select: {
      compartmentId: true,
      startsAt: true,
      endsAt: true,
    },
    orderBy: { startsAt: 'asc' },
  });

  // Detect overlaps
  const compartmentBookings = new Map<string, typeof upcomingBookings>();
  for (const booking of upcomingBookings) {
    if (!compartmentBookings.has(booking.compartmentId)) {
      compartmentBookings.set(booking.compartmentId, []);
    }
    compartmentBookings.get(booking.compartmentId)!.push(booking);
  }

  let conflictsCount = 0;
  for (const bookings of compartmentBookings.values()) {
    for (let i = 0; i < bookings.length - 1; i++) {
      const current = bookings[i];
      const next = bookings[i + 1];
      if (current.endsAt > next.startsAt) {
        conflictsCount++;
      }
    }
  }

  // Get disabled compartments count
  const disabledCount = await prisma.compartment.count({
    where: { active: false },
  });

  return {
    conflicts: conflictsCount,
    disabledCompartments: disabledCount,
  };
}

export async function AlertsPanel() {
  const alerts = await getAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.conflicts > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Booking Conflicts Detected</AlertTitle>
            <AlertDescription>
              {alerts.conflicts} booking conflict(s) found. Please review and resolve immediately.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>No Conflicts</AlertTitle>
            <AlertDescription>
              All bookings are properly scheduled without overlaps.
            </AlertDescription>
          </Alert>
        )}

        {alerts.disabledCompartments > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Maintenance Notice</AlertTitle>
            <AlertDescription>
              {alerts.disabledCompartments} compartment(s) are currently disabled for maintenance.
            </AlertDescription>
          </Alert>
        )}

        {alerts.conflicts === 0 && alerts.disabledCompartments === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>All Systems Operational</AlertTitle>
            <AlertDescription>
              No issues detected. Everything is running smoothly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
