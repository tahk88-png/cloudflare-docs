import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/requireRole";
import { KpiCards } from "@/components/admin/KpiCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getTodayBookingsCount,
  getUpcoming24hBookingsCount,
  findBookingConflicts,
} from "@/lib/admin/bookings";
import { getActiveProductsCount } from "@/lib/admin/products";
import {
  getActiveCompartmentsCount,
  getDisabledCompartmentsCount,
  getMaintenanceCompartments,
} from "@/lib/admin/compartments";
import { formatLocalDateTime } from "@/lib/timezone";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Package,
} from "lucide-react";

async function DashboardStats() {
  const [
    todayBookings,
    upcoming24hBookings,
    activeProducts,
    activeCompartments,
    disabledCompartments,
  ] = await Promise.all([
    getTodayBookingsCount(),
    getUpcoming24hBookingsCount(),
    getActiveProductsCount(),
    getActiveCompartmentsCount(),
    getDisabledCompartmentsCount(),
  ]);

  return (
    <KpiCards
      stats={{
        todayBookings,
        upcoming24hBookings,
        activeProducts,
        activeCompartments,
        disabledCompartments,
      }}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function AlertsPanel() {
  const [conflicts, maintenanceCompartments] = await Promise.all([
    findBookingConflicts(),
    getMaintenanceCompartments(),
  ]);

  const hasConflicts = conflicts.length > 0;
  const hasMaintenance = maintenanceCompartments.length > 0;

  if (!hasConflicts && !hasMaintenance) {
    return (
      <Alert variant="success" className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">All Systems Operational</AlertTitle>
        <AlertDescription className="text-green-700">
          No conflicts or issues detected.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {hasConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Booking Conflicts Detected</AlertTitle>
          <AlertDescription>
            {conflicts.length} compartment(s) have overlapping bookings. This
            should not happen in normal operation.
          </AlertDescription>
        </Alert>
      )}

      {hasMaintenance && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50">
          <Wrench className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Compartments in Maintenance</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="mt-2 space-y-1">
              {maintenanceCompartments.slice(0, 5).map((comp) => (
                <div key={comp.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {comp.locker.name} - {comp.label}
                  </span>
                  {comp.notes && (
                    <span className="text-muted-foreground">({comp.notes})</span>
                  )}
                </div>
              ))}
              {maintenanceCompartments.length > 5 && (
                <Link
                  href="/admin/compartments?active=false"
                  className="text-sm underline"
                >
                  View all {maintenanceCompartments.length} compartments
                </Link>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function AlertsSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}

export default async function AdminDashboardPage() {
  await requirePermission("VIEW_DASHBOARD");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Rentbox operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/bookings?new=true">
              <Calendar className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products?new=true">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<KpiSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Alerts Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
          <CardDescription>
            Issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AlertsSkeleton />}>
            <AlertsPanel />
          </Suspense>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/bookings">
                <Calendar className="mr-2 h-4 w-4" />
                View All Bookings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/compartments">
                <Wrench className="mr-2 h-4 w-4" />
                Manage Compartments
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/products">
                <Package className="mr-2 h-4 w-4" />
                Manage Products
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest changes in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View the{" "}
              <Link href="/admin/audit" className="text-primary underline">
                audit log
              </Link>{" "}
              for detailed activity history.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">System Info</CardTitle>
            <CardDescription>Current configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timezone</span>
              <Badge variant="outline">Europe/Tallinn</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Time</span>
              <span>{formatLocalDateTime(new Date())}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
