import { prisma } from '@/lib/db';
import { BookingStatus } from '@prisma/client';
import { createAuditLog } from './audit';
import { z } from 'zod';
import { RENTBOX_TIMEZONE } from '@/lib/timezone';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const bookingSchema = z.object({
	productId: z.string().min(1),
	compartmentId: z.string().min(1),
	startsAt: z.string().datetime(),
	endsAt: z.string().datetime(),
	userId: z.string().optional(),
	status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
});

export async function checkBookingOverlap(
	compartmentId: string,
	startsAt: Date,
	endsAt: Date,
	excludeBookingId?: string,
): Promise<boolean> {
	const overlaps = await prisma.booking.findFirst({
		where: {
			compartmentId,
			id: excludeBookingId ? { not: excludeBookingId } : undefined,
			status: {
				in: ['pending', 'confirmed'],
			},
			OR: [
				{
					AND: [
						{ startsAt: { lte: startsAt } },
						{ endsAt: { gt: startsAt } },
					],
				},
				{
					AND: [
						{ startsAt: { lt: endsAt } },
						{ endsAt: { gte: endsAt } },
					],
				},
				{
					AND: [
						{ startsAt: { gte: startsAt } },
						{ endsAt: { lte: endsAt } },
					],
				},
			],
		},
	});

	return !!overlaps;
}

export async function createBooking(
	data: z.infer<typeof bookingSchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = bookingSchema.parse(data);
	const startsAt = new Date(validated.startsAt);
	const endsAt = new Date(validated.endsAt);

	if (endsAt <= startsAt) {
		throw new Error('End time must be after start time');
	}

	if (startsAt < new Date()) {
		throw new Error('Cannot create bookings in the past');
	}

	const hasOverlap = await checkBookingOverlap(validated.compartmentId, startsAt, endsAt);
	if (hasOverlap) {
		throw new Error('Booking overlaps with existing booking');
	}

	const booking = await prisma.booking.create({
		data: {
			productId: validated.productId,
			compartmentId: validated.compartmentId,
			userId: validated.userId,
			startsAt,
			endsAt,
			status: validated.status,
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

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'booking',
		entityId: booking.id,
		afterJson: booking,
		ip,
	});

	return booking;
}

export async function updateBookingStatus(
	bookingId: string,
	status: BookingStatus,
	actorUserId: string,
	ip?: string,
) {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
	});

	if (!booking) {
		throw new Error('Booking not found');
	}

	const updated = await prisma.booking.update({
		where: { id: bookingId },
		data: { status },
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

	await createAuditLog({
		actorUserId,
		action: 'status_change',
		entityType: 'booking',
		entityId: bookingId,
		beforeJson: booking,
		afterJson: updated,
		ip,
	});

	return updated;
}

export async function updateBooking(
	bookingId: string,
	data: Partial<z.infer<typeof bookingSchema>>,
	actorUserId: string,
	ip?: string,
) {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
	});

	if (!booking) {
		throw new Error('Booking not found');
	}

	const updateData: any = {};
	if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
	if (data.endsAt) updateData.endsAt = new Date(data.endsAt);
	if (data.productId) updateData.productId = data.productId;
	if (data.compartmentId) updateData.compartmentId = data.compartmentId;
	if (data.status) updateData.status = data.status;

	if (updateData.startsAt && updateData.endsAt) {
		if (updateData.endsAt <= updateData.startsAt) {
			throw new Error('End time must be after start time');
		}

		const hasOverlap = await checkBookingOverlap(
			updateData.compartmentId || booking.compartmentId,
			updateData.startsAt || booking.startsAt,
			updateData.endsAt || booking.endsAt,
			bookingId,
		);
		if (hasOverlap) {
			throw new Error('Booking overlaps with existing booking');
		}
	}

	const updated = await prisma.booking.update({
		where: { id: bookingId },
		data: updateData,
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

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'booking',
		entityId: bookingId,
		beforeJson: booking,
		afterJson: updated,
		ip,
	});

	return updated;
}
