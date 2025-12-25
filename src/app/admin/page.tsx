import { prisma } from "@/lib/prisma";
import { KpiCards } from "@/components/admin/KpiCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { startOfDay, endOfDay, addHours } from "date-fns";

async function getKpiData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const next24h = addHours(now, 24);

  // Parallel fetch
  const [
    todayBookings,
    upcoming24h,
    activeProducts,
    activeCompartments,
    disabledCompartments,
    // conflicts and failed payments would need complex queries or separate tracking
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        starts_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.booking.count({
      where: {
        starts_at: {
          gte: now,
          lte: next24h,
        },
      },
    }),
    prisma.product.count({ where: { active: true } }),
    prisma.compartment.count({ where: { active: true } }),
    prisma.compartment.count({ where: { active: false } }),
  ]);

  return {
    todayBookings,
    upcoming24h,
    activeProducts,
    activeCompartments,
    disabledCompartments,
    conflicts: 0, // Placeholder
    fullyBooked: 0, // Placeholder
    failedPayments: 0, // Placeholder
  };
}

export default async function DashboardPage() {
  const data = await getKpiData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
           <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
           </Link>
           <Link href="/admin/bookings/new">
            <Button variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> Manual Booking
            </Button>
           </Link>
        </div>
      </div>
      
      <KpiCards data={data} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {/* Chart would go here */}
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {/* Audit log items would go here */}
                <div className="text-sm text-muted-foreground">No recent actions</div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
