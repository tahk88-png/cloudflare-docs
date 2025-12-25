import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Package,
  Box,
  AlertTriangle,
} from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("kpi-glow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600"
            )}
          >
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStats {
  todayBookings: number;
  upcoming24hBookings: number;
  activeProducts: number;
  activeCompartments: number;
  disabledCompartments: number;
}

interface KpiCardsProps {
  stats: DashboardStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        title="Today's Bookings"
        value={stats.todayBookings}
        description="Active bookings today"
        icon={Calendar}
      />
      <KpiCard
        title="Upcoming (24h)"
        value={stats.upcoming24hBookings}
        description="Bookings in next 24 hours"
        icon={Clock}
      />
      <KpiCard
        title="Active Products"
        value={stats.activeProducts}
        description="Available for rental"
        icon={Package}
      />
      <KpiCard
        title="Active Compartments"
        value={stats.activeCompartments}
        description="Ready to use"
        icon={Box}
      />
      <KpiCard
        title="In Maintenance"
        value={stats.disabledCompartments}
        description="Disabled compartments"
        icon={AlertTriangle}
        className={
          stats.disabledCompartments > 0
            ? "border-amber-500/50 bg-amber-50/50"
            : ""
        }
      />
    </div>
  );
}

export { KpiCard };
