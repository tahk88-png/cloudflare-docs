// POST /api/admin/bookings/:id/force-release - Force release booking (admin)
import type { APIRoute } from 'astro';
import { query } from '~/lib/booking/db/client';

export const POST: APIRoute = async ({ params, request }) => {
	try {
		// In production, verify admin authentication here

		const bookingId = params.id;

		if (!bookingId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Booking ID is required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const body = await request.json();
		const { reason } = body;

		// Cancel booking
		await query(
			"UPDATE bookings SET status = 'cancelled' WHERE id = $1",
			[bookingId]
		);

		// Log the action (in production, add to audit log)
		console.log(`Booking ${bookingId} force-released. Reason: ${reason || 'Admin action'}`);

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Booking released',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
