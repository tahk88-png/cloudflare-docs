import { getBookings } from "@/lib/admin/bookings";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BookingStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
  const status = params.status as BookingStatus | undefined;
  const page = params.page ? parseInt(params.page as string) : 1;
  
  const { bookings, total } = await getBookings({ status, page });

  const columns = [
    {
      header: "Starts At",
      cell: (row: any) => (
        <div className="flex flex-col">
            <span className="font-medium">{format(row.starts_at, "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(row.starts_at, "HH:mm")}</span>
        </div>
      ),
    },
    {
      header: "Product",
      accessorKey: "product" as const,
      cell: (row: any) => row.product?.name || "N/A",
    },
    {
        header: "Location",
        cell: (row: any) => (
            <div className="flex flex-col">
                <span>{row.compartment?.locker?.name}</span>
                <span className="text-xs text-muted-foreground">{row.compartment?.label}</span>
            </div>
        )
    },
    {
      header: "User",
      cell: (row: any) => (
        <div className="flex flex-col">
            <span>{row.user?.name || "Guest"}</span>
            <span className="text-xs text-muted-foreground">{row.user?.email || "-"}</span>
        </div>
      )
    },
    {
      header: "Status",
      cell: (row: any) => {
        const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          [BookingStatus.CONFIRMED]: "default",
          [BookingStatus.PENDING]: "secondary",
          [BookingStatus.CANCELLED]: "destructive",
          [BookingStatus.COMPLETED]: "outline",
        };
        return <Badge variant={colors[row.status] || "outline"}>{row.status}</Badge>;
      },
    },
    {
        header: "Actions",
        cell: (row: any) => (
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/bookings/${row.id}`}>View</Link>
            </Button>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <Link href="/admin/bookings/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Booking
            </Button>
        </Link>
      </div>
      
      <DataTable columns={columns} data={bookings} />
    </div>
  );
}
