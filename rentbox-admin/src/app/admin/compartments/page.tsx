import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/requireRole";
import { getCompartments } from "@/lib/admin/compartments";
import { getLockers } from "@/lib/admin/lockers";
import { getProducts } from "@/lib/admin/products";
import { CompartmentsClient } from "./compartments-client";
import { SkeletonTable } from "@/components/admin/SkeletonTable";

interface PageProps {
  searchParams: Promise<{
    lockerId?: string;
    active?: string;
  }>;
}

async function CompartmentsData({ searchParams }: PageProps) {
  const params = await searchParams;

  const [compartments, lockers, productsData] = await Promise.all([
    getCompartments({
      lockerId: params.lockerId,
      active: params.active ? params.active === "true" : undefined,
    }),
    getLockers(),
    getProducts({ pageSize: 100 }),
  ]);

  return (
    <CompartmentsClient
      compartments={compartments}
      lockers={lockers}
      products={productsData.items}
    />
  );
}

export default async function CompartmentsPage(props: PageProps) {
  await requirePermission("VIEW_PRODUCTS");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compartments</h1>
        <p className="text-muted-foreground">
          Manage compartments and their product assignments
        </p>
      </div>

      <Suspense fallback={<SkeletonTable columns={6} rows={10} />}>
        <CompartmentsData searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
