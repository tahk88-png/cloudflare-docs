import { prisma } from '@/lib/db';
import { BookingStatus } from '@prisma/client';
import { nowInRentboxTimeZone } from '../timezone';

export interface SystemHealth {
	lockersOnline: number;
	lockersTotal: number;
	lastOpenEvent?: Date;
	doorErrors: number;
	lockErrors: number;
}

export interface BookingIntelligence {
	todayBookings: number;
	next24hBookings: number;
	fullyBookedCompartments: number;
	overdueReturns: number;
	conflicts: number;
}

export interface ProductIntelligence {
	productId: string;
	productName: string;
	usageHours: number;
	avgRentalDuration: number;
	revenue: number;
	maintenanceCount: number;
}

/**
 * Get system health metrics
 */
export async function getSystemHealth(): Promise<SystemHealth> {
	const lockers = await prisma.locker.findMany({
		where: { active: true },
	});

	// TODO: Implement actual locker online/offline status check
	// For now, assume all active lockers are online
	const lockersOnline = lockers.length;
	const lockersTotal = lockers.length;

	// Get last open event (from bookings or events table)
	// TODO: Implement actual event tracking
	const lastOpenEvent = await prisma.booking.findFirst({
		where: {
			status: 'confirmed',
		},
		orderBy: {
			updatedAt: 'desc',
		},
		select: {
			updatedAt: true,
		},
	});

	// TODO: Implement door/lock error tracking
	const doorErrors = 0;
	const lockErrors = 0;

	return {
		lockersOnline,
		lockersTotal,
		lastOpenEvent: lastOpenEvent?.updatedAt,
		doorErrors,
		lockErrors,
	};
}

/**
 * Get booking intelligence metrics
 */
export async function getBookingIntelligence(): Promise<BookingIntelligence> {
	const now = nowInRentboxTimeZone();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);
	const next24h = new Date(now);
	next24h.setHours(now.getHours() + 24);

	const [todayBookings, next24hBookings, overdueReturns, conflicts] = await Promise.all([
		prisma.booking.count({
			where: {
				startsAt: {
					gte: todayStart,
					lte: todayEnd,
				},
				status: {
					in: ['pending', 'confirmed'],
				},
			},
		}),
		prisma.booking.count({
			where: {
				startsAt: {
					gte: now,
					lte: next24h,
				},
				status: {
					in: ['pending', 'confirmed'],
				},
			},
		}),
		prisma.booking.count({
			where: {
				endsAt: {
					lt: now,
				},
				status: {
					in: ['pending', 'confirmed'],
				},
			},
		}),
		// Check for conflicts
		prisma.$queryRaw<Array<{ count: bigint }>>`
			SELECT COUNT(DISTINCT b1.id) as count
			FROM "Booking" b1
			INNER JOIN "Booking" b2 ON b1."compartmentId" = b2."compartmentId"
			WHERE b1.id != b2.id
			AND b1.status IN ('pending', 'confirmed')
			AND b2.status IN ('pending', 'confirmed')
			AND (
				(b1."startsAt" < b2."endsAt" AND b1."endsAt" > b2."startsAt")
			)
		`,
	]);

	// Fully booked compartments today
	const fullyBookedCompartments = await prisma.$queryRaw<Array<{ count: bigint }>>`
		SELECT COUNT(DISTINCT "compartmentId") as count
		FROM (
			SELECT "compartmentId", COUNT(*) as booking_count
			FROM "Booking"
			WHERE "startsAt" >= ${todayStart}
			AND "startsAt" <= ${todayEnd}
			AND status IN ('pending', 'confirmed')
			GROUP BY "compartmentId"
			HAVING COUNT(*) >= (
				SELECT COUNT(*) FROM "Compartment" c2
				WHERE c2.id = "Booking"."compartmentId"
			)
		) fully_booked
	`;

	return {
		todayBookings,
		next24hBookings,
		fullyBookedCompartments: Number(fullyBookedCompartments[0]?.count || 0),
		overdueReturns,
		conflicts: Number(conflicts[0]?.count || 0),
	};
}

/**
 * Get product intelligence metrics
 */
export async function getProductIntelligence(): Promise<ProductIntelligence[]> {
	const products = await prisma.product.findMany({
		where: { active: true },
		include: {
			bookings: {
				where: {
					status: {
						in: ['confirmed', 'completed'],
					},
				},
			},
		},
	});

	return products.map((product) => {
		const bookings = product.bookings;
		const completedBookings = bookings.filter((b) => b.status === 'completed');

		// Calculate usage hours
		const usageHours = completedBookings.reduce((sum, booking) => {
			const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
			const hours = durationMs / (1000 * 60 * 60);
			return sum + hours;
		}, 0);

		// Average rental duration
		const avgRentalDuration =
			completedBookings.length > 0
				? completedBookings.reduce((sum, booking) => {
						const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
						return sum + durationMs;
					}, 0) / completedBookings.length / (1000 * 60 * 60) // Convert to hours
				: 0;

		// Revenue (simplified - use base price)
		const revenue = completedBookings.reduce((sum, booking) => {
			const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
			const hours = durationMs / (1000 * 60 * 60);
			const days = hours / 24;
			const priceUnit = product.priceUnit === 'day' ? days : hours;
			return sum + Number(product.basePrice) * priceUnit;
		}, 0);

		// Maintenance count (from compartments with notes or inactive)
		const maintenanceCount = 0; // TODO: Track actual maintenance events

		return {
			productId: product.id,
			productName: product.name,
			usageHours: Math.round(usageHours * 10) / 10,
			avgRentalDuration: Math.round(avgRentalDuration * 10) / 10,
			revenue: Math.round(revenue * 100) / 100,
			maintenanceCount,
		};
	});
}
