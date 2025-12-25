import { prisma } from '@/lib/db';
import { BookingStatus } from '@prisma/client';

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

export interface AvailabilityInfo {
	status: AvailabilityStatus;
	count: number;
	nextAvailable?: Date;
	hint?: string;
}

/**
 * Calculate availability for a product
 * Returns status based on active compartments count
 */
export async function getProductAvailability(
	productId: string,
	startDate?: Date,
	endDate?: Date,
): Promise<AvailabilityInfo> {
	const activeCompartments = await prisma.compartment.count({
		where: {
			productId,
			active: true,
		},
	});

	if (activeCompartments === 0) {
		return {
			status: 'unavailable',
			count: 0,
			hint: 'Pole hetkel',
		};
	}

	// If date range provided, check actual bookings
	if (startDate && endDate) {
		const bookedCompartments = await prisma.booking.count({
			where: {
				productId,
				compartment: {
					active: true,
				},
				status: {
					in: ['pending', 'confirmed'],
				},
				OR: [
					{
						AND: [
							{ startsAt: { lte: startDate } },
							{ endsAt: { gt: startDate } },
						],
					},
					{
						AND: [
							{ startsAt: { lt: endDate } },
							{ endsAt: { gte: endDate } },
						],
					},
					{
						AND: [
							{ startsAt: { gte: startDate } },
							{ endsAt: { lte: endDate } },
						],
					},
				],
			},
		});

		const available = activeCompartments - bookedCompartments;

		if (available === 0) {
			// Find next available slot
			const nextBooking = await prisma.booking.findFirst({
				where: {
					productId,
					compartment: {
						active: true,
					},
					status: {
						in: ['pending', 'confirmed'],
					},
					endsAt: {
						gte: new Date(),
					},
				},
				orderBy: {
					endsAt: 'asc',
				},
			});

			if (nextBooking) {
				const hint = formatNextAvailable(nextBooking.endsAt);
				return {
					status: 'unavailable',
					count: 0,
					nextAvailable: nextBooking.endsAt,
					hint,
				};
			}

			return {
				status: 'unavailable',
				count: 0,
				hint: 'Pole hetkel',
			};
		}

		if (available === 1) {
			return {
				status: 'limited',
				count: 1,
				hint: 'Piiratud',
			};
		}

		return {
			status: 'available',
			count: available,
			hint: 'Saadaval',
		};
	}

	// General availability (no date range)
	if (activeCompartments === 1) {
		return {
			status: 'limited',
			count: 1,
			hint: 'Piiratud',
		};
	}

	return {
		status: 'available',
		count: activeCompartments,
		hint: 'Saadaval',
	};
}

function formatNextAvailable(date: Date): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffHours = diffMs / (1000 * 60 * 60);

	if (diffHours < 24) {
		// Same day
		const hours = Math.floor(diffHours);
		const minutes = Math.floor((diffHours - hours) * 60);
		if (hours === 0) {
			return `Vaba ${minutes} minuti pärast`;
		}
		return `Vaba ${hours}:${minutes.toString().padStart(2, '0')} pärast`;
	}

	// Next day or later
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	if (date.getTime() < tomorrow.getTime() + 24 * 60 * 60 * 1000) {
		// Tomorrow
		const timeStr = date.toLocaleTimeString('et-EE', {
			hour: '2-digit',
			minute: '2-digit',
		});
		return `Vaba homme ${timeStr}`;
	}

	// Later
	const dateStr = date.toLocaleDateString('et-EE', {
		day: 'numeric',
		month: 'long',
	});
	const timeStr = date.toLocaleTimeString('et-EE', {
		hour: '2-digit',
		minute: '2-digit',
	});
	return `Vaba ${dateStr} ${timeStr}`;
}
