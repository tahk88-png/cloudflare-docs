"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@shared/api";
import { Booking } from "@shared/types";
import { format } from "date-fns";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      api.getAdminBookings(token).then(setBookings).finally(() => setLoading(false));
    }
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Bookings</h1>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{booking.product?.name || "Unknown"}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {booking.compartment?.code} - {booking.locker?.name}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Start:</span> {format(new Date(booking.startAt), "PPp")}
                  </p>
                  <p>
                    <span className="font-medium">End:</span> {format(new Date(booking.endAt), "PPp")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
