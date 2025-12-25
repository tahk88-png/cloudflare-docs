// POST /api/cart - Create a new cart
import type { APIRoute } from 'astro';
import { createCart } from '~/lib/booking/cart';

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const { user_id } = body;

		const cart = await createCart(user_id);

		return new Response(
			JSON.stringify({
				success: true,
				cart: {
					id: cart.id,
					user_id: cart.user_id,
					status: cart.status,
					expires_at: cart.expires_at.toISOString(),
					created_at: cart.created_at.toISOString(),
				},
			}),
			{
				status: 201,
				headers: {
					'Content-Type': 'application/json',
				},
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
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
};
