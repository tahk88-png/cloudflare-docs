import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';

/**
 * Safety net: Handle locker open failures
 */
export async function logLockerFailure(
	compartmentId: string,
	bookingId: string,
	error: string,
	actorUserId: string,
) {
	await createAuditLog({
		actorUserId,
		action: 'status_change',
		entityType: 'booking',
		entityId: bookingId,
		beforeJson: { status: 'confirmed' },
		afterJson: {
			status: 'confirmed',
			lockerFailure: true,
			error,
			compartmentId,
		},
	});

	// TODO: Send alert to admin
	// TODO: Create incident log entry
}

/**
 * Safety net: Retry locker open
 */
export async function retryLockerOpen(bookingId: string, actorUserId: string) {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: {
			compartment: {
				include: {
					locker: true,
				},
			},
		},
	});

	if (!booking) {
		throw new Error('Booking not found');
	}

	// TODO: Implement actual locker open API call
	// For now, just log the retry
	await createAuditLog({
		actorUserId,
		action: 'status_change',
		entityType: 'booking',
		entityId: bookingId,
		beforeJson: booking,
		afterJson: { ...booking, retryAttempt: true },
	});

	return { success: true };
}

/**
 * Safety net: Contact support one-tap
 */
export async function createSupportTicket(
	bookingId: string,
	issue: string,
	actorUserId: string,
) {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: {
			product: true,
			compartment: {
				include: {
					locker: true,
				},
			},
		},
	});

	if (!booking) {
		throw new Error('Booking not found');
	}

	// Create support ticket (you might want a separate SupportTicket model)
	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'booking',
		entityId: bookingId,
		afterJson: {
			supportTicket: true,
			issue,
			booking: booking.id,
			compartment: booking.compartment.label,
			locker: booking.compartment.locker.name,
		},
	});

	// TODO: Send notification to support team
	// TODO: Create actual support ticket in ticketing system

	return { success: true, ticketId: `TICKET-${Date.now()}` };
}

/**
 * Safety net: Handle abandoned bookings
 */
export async function processAbandonedBookings() {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	const abandonedBookings = await prisma.booking.findMany({
		where: {
			status: 'pending',
			createdAt: {
				lt: oneHourAgo,
			},
		},
	});

	// Cancel abandoned bookings after 1 hour
	for (const booking of abandonedBookings) {
		await prisma.booking.update({
			where: { id: booking.id },
			data: {
				status: 'cancelled',
			},
		});

		await createAuditLog({
			actorUserId: 'system',
			action: 'status_change',
			entityType: 'booking',
			entityId: booking.id,
			beforeJson: booking,
			afterJson: { ...booking, status: 'cancelled', reason: 'abandoned' },
		});
	}

	return abandonedBookings.length;
}
