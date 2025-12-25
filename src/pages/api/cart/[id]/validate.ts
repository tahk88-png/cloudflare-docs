// POST /api/cart/:id/validate - Validate cart before checkout
import type { APIRoute } from 'astro';
import { validateCart } from '~/lib/booking/cart';

export const POST: APIRoute = async ({ params }) => {
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

		const validation = await validateCart(cartId);

		return new Response(
			JSON.stringify({
				success: true,
				validation,
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
