import { BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { listBookings } from "@/lib/admin/bookings";
import { BookingsClient } from "@/components/admin/bookings/BookingsClient";

export default async function AdminBookingsPage({
	searchParams,
}: {
	searchParams?: { lockerId?: string; status?: BookingStatus; compartmentId?: string };
}) {
	const lockerId = searchParams?.lockerId;
	const status = searchParams?.status;
	const compartmentId = searchParams?.compartmentId;

	const [lockers, compartments, bookings] = await Promise.all([
		prisma.locker.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
		prisma.compartment.findMany({
			where: { active: true },
			orderBy: [{ locker: { name: "asc" } }, { label: "asc" }],
			include: { product: true },
		}),
		listBookings({ lockerId, status, compartmentId }),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Bookings</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Manage reservations, confirm/cancel, and detect conflicts.
				</p>
			</div>

			<BookingsClient
				bookings={bookings as any}
				lockers={lockers}
				compartments={compartments as any}
			/>
		</div>
	);
}

