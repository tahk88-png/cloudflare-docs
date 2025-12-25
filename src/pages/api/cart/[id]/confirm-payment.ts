// POST /api/cart/:id/confirm-payment - Confirm payment (called after Stripe redirect)
import type { APIRoute } from 'astro';
import { confirmPayment } from '~/lib/booking/payment';

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const cartId = params.id;

		if (!cartId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cart ID is required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const body = await request.json();
		const { payment_intent_id, user_id } = body;

		if (!payment_intent_id || !user_id) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'payment_intent_id and user_id are required',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const result = await confirmPayment(payment_intent_id, user_id);

		return new Response(
			JSON.stringify({
				success: true,
				bookings: result.bookings.map((booking) => ({
					id: booking.id,
					product_id: booking.product_id,
					compartment_id: booking.compartment_id,
					start_at: booking.start_at.toISOString(),
					end_at: booking.end_at.toISOString(),
					status: booking.status,
					total_price: booking.total_price,
					deposit: booking.deposit,
				})),
				payment: {
					id: result.payment.id,
					status: result.payment.status,
					amount: result.payment.amount,
					currency: result.payment.currency,
				},
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
