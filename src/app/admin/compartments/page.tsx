import { prisma } from "@/lib/db/prisma";
import { listCompartments } from "@/lib/admin/compartments";
import { CompartmentsClient } from "@/components/admin/compartments/CompartmentsClient";

export default async function AdminCompartmentsPage({
	searchParams,
}: {
	searchParams?: { lockerId?: string };
}) {
	const lockerId = searchParams?.lockerId;
	const [lockers, products, compartments] = await Promise.all([
		prisma.locker.findMany({ orderBy: { name: "asc" } }),
		prisma.product.findMany({ orderBy: { name: "asc" } }),
		listCompartments({ lockerId }),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Compartments</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Assign products, set maintenance, and view upcoming bookings per compartment.
				</p>
			</div>

			<CompartmentsClient companions={compartments} lockers={lockers} products={products} />
		</div>
	);
}

