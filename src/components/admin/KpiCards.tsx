import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, Box, AlertTriangle, CreditCard } from "lucide-react";

interface KpiData {
  todayBookings: number;
  upcoming24h: number;
  activeProducts: number;
  activeCompartments: number;
  disabledCompartments: number;
  conflicts: number;
  fullyBooked: number;
  failedPayments: number;
}

export function KpiCards({ data }: { data: KpiData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Today's Bookings
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.todayBookings}</div>
          <p className="text-xs text-muted-foreground">
            {data.upcoming24h} upcoming in 24h
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Inventory
          </CardTitle>
          <Box className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeCompartments}</div>
          <p className="text-xs text-muted-foreground">
            {data.activeProducts} active products
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Maintenance
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.disabledCompartments}</div>
          <p className="text-xs text-muted-foreground">
            Disabled compartments
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Issues
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.conflicts + data.failedPayments}</div>
          <p className="text-xs text-muted-foreground">
            {data.conflicts} conflicts, {data.failedPayments} failed payments
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
