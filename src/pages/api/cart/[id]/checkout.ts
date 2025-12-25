// POST /api/cart/:id/checkout - Initiate checkout
import type { APIRoute } from 'astro';
import { createCheckout } from '~/lib/booking/payment';

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
		const { user_id, return_url } = body;

		if (!user_id || !return_url) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'user_id and return_url are required',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const checkout = await createCheckout(user_id, {
			cart_id: cartId,
			return_url,
		});

		return new Response(
			JSON.stringify({
				success: true,
				checkout,
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
