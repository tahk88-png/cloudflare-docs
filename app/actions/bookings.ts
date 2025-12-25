'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createBooking, updateBookingStatus, updateBooking } from '@/lib/admin/bookings';
import { requireAuth } from '@/lib/auth/requireRole';
import { bookingSchema } from '@/lib/admin/bookings';
import { z } from 'zod';

export async function createBookingAction(formData: FormData) {
	const user = await requireAuth();

	try {
		const data = {
			productId: formData.get('productId') as string,
			compartmentId: formData.get('compartmentId') as string,
			startsAt: formData.get('startsAt') as string,
			endsAt: formData.get('endsAt') as string,
			userId: formData.get('userId') as string | undefined,
			status: (formData.get('status') as any) || 'pending',
		};

		await createBooking(data, user.id);
		revalidatePath('/admin/bookings');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create booking',
		};
	}
}

export async function updateBookingStatusAction(
	bookingId: string,
	status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
) {
	const user = await requireAuth();

	try {
		await updateBookingStatus(bookingId, status, user.id);
		revalidatePath('/admin/bookings');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update booking',
		};
	}
}
