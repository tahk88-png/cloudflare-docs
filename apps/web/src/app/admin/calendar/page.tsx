"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCalendarPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Calendar</h1>
      <Card>
        <CardHeader>
          <CardTitle>Timeline View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-medium">Today - 09:00 to 13:00</p>
              <p className="text-sm text-muted-foreground">Booking: Makita DHR242Z - A01</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="font-medium">Tomorrow - 14:00 to 18:00</p>
              <p className="text-sm text-muted-foreground">Maintenance Block</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <p className="font-medium">Day After - 10:00 to 12:00</p>
              <p className="text-sm text-muted-foreground">System Update</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
