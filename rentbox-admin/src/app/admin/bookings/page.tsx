import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/requireRole";
import { getBookings } from "@/lib/admin/bookings";
import { getLockers } from "@/lib/admin/lockers";
import { getProducts } from "@/lib/admin/products";
import { BookingsClient } from "./bookings-client";
import { SkeletonTable } from "@/components/admin/SkeletonTable";
import type { BookingStatus } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: BookingStatus;
    lockerId?: string;
    productId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

async function BookingsData({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;

  const [bookingsData, lockers, productsData] = await Promise.all([
    getBookings({
      page,
      pageSize: 20,
      filters: {
        status: params.status,
        lockerId: params.lockerId,
        productId: params.productId,
        dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
        dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      },
    }),
    getLockers(),
    getProducts({ pageSize: 100 }),
  ]);

  return (
    <BookingsClient
      bookings={bookingsData.items}
      totalPages={bookingsData.totalPages}
      currentPage={page}
      total={bookingsData.total}
      lockers={lockers}
      products={productsData.items}
    />
  );
}

export default async function BookingsPage(props: PageProps) {
  await requirePermission("VIEW_BOOKINGS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">
          Manage all rental bookings
        </p>
      </div>

      <Suspense fallback={<SkeletonTable columns={7} rows={10} />}>
        <BookingsData searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
