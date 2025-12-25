'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createBooking } from '@/lib/admin/bookings';
import { requireAuth } from '@/lib/auth/requireRole';
import { z } from 'zod';

const bookingFormSchema = z.object({
	productId: z.string().min(1),
	compartmentId: z.string().min(1),
	date: z.string(),
	startTime: z.string(),
	endTime: z.string(),
});

export async function createBookingAction(formData: FormData) {
	try {
		// For now, allow unauthenticated bookings (guest checkout)
		// In production, you might want to require auth or create guest user
		const userId = undefined;

		const data = bookingFormSchema.parse({
			productId: formData.get('productId'),
			compartmentId: formData.get('compartmentId'),
			date: formData.get('date'),
			startTime: formData.get('startTime'),
			endTime: formData.get('endTime'),
		});

		// Combine date and time
		const [year, month, day] = data.date.split('-').map(Number);
		const [startHour, startMin] = data.startTime.split(':').map(Number);
		const [endHour, endMin] = data.endTime.split(':').map(Number);

		const startsAt = new Date(Date.UTC(year, month - 1, day, startHour, startMin));
		const endsAt = new Date(Date.UTC(year, month - 1, day, endHour, endMin));

		// Use system user for now (in production, use actual user or guest)
		const systemUserId = 'system'; // TODO: Get from session or create guest user

		await createBooking(
			{
				productId: data.productId,
				compartmentId: data.compartmentId,
				userId: userId,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
				status: 'pending',
			},
			systemUserId,
		);

		revalidatePath('/tooriistad');
		return { success: true };
	} catch (error) {
		console.error('Booking creation error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Broneeringu loomine ebaõnnestus',
		};
	}
}
