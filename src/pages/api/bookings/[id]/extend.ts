// POST /api/bookings/:id/extend - Extend rental
import type { APIRoute } from 'astro';
import { extendRental } from '~/lib/booking/booking';

export const POST: APIRoute = async ({ params, request }) => {
	try {
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
		const { new_end_at } = body;

		if (!new_end_at) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'new_end_at is required',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const result = await extendRental({
			booking_id: bookingId,
			new_end_at: new Date(new_end_at),
		});

		return new Response(
			JSON.stringify({
				success: result.success,
				booking_id: result.booking_id,
				original_end_at: result.original_end_at.toISOString(),
				new_end_at: result.new_end_at.toISOString(),
				additional_cost: result.additional_cost,
				payment_intent_id: result.payment_intent_id,
				client_secret: result.client_secret,
				error: result.error,
			}),
			{
				status: result.success ? 200 : 400,
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
