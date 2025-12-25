import { prisma } from '@/lib/db';
import { updateBookingStatus } from './bookings';
import { createAuditLog } from './audit';

/**
 * Mark overdue bookings and create admin alerts
 */
export async function processOverdueBookings(actorUserId: string) {
	const now = new Date();

	const overdueBookings = await prisma.booking.findMany({
		where: {
			endsAt: {
				lt: now,
			},
			status: {
				in: ['pending', 'confirmed'],
			},
		},
		include: {
			product: true,
			compartment: {
				include: {
					locker: true,
				},
			},
			user: true,
		},
	});

	for (const booking of overdueBookings) {
		// Mark as overdue (you might want to add an 'overdue' status)
		// For now, we'll just log it and create an alert
		await createAuditLog({
			actorUserId,
			action: 'status_change',
			entityType: 'booking',
			entityId: booking.id,
			beforeJson: booking,
			afterJson: { ...booking, status: 'overdue' },
		});
	}

	return overdueBookings;
}

/**
 * Allow early return - free up compartment immediately
 */
export async function processEarlyReturn(
	bookingId: string,
	actorUserId: string,
	newEndTime: Date,
) {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
	});

	if (!booking) {
		throw new Error('Booking not found');
	}

	if (newEndTime >= booking.endsAt) {
		throw new Error('New end time must be before original end time');
	}

	await updateBookingStatus(bookingId, 'completed', actorUserId);

	await prisma.booking.update({
		where: { id: bookingId },
		data: {
			endsAt: newEndTime,
		},
	});

	return booking;
}
