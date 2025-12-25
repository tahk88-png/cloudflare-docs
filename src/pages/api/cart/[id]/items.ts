// POST /api/cart/:id/items - Add item to cart
import type { APIRoute } from 'astro';
import { addCartItem } from '~/lib/booking/cart';

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
		const { product_id, start_at, end_at } = body;

		if (!product_id || !start_at || !end_at) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'product_id, start_at, and end_at are required',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const item = await addCartItem(
			cartId,
			product_id,
			new Date(start_at),
			new Date(end_at)
		);

		return new Response(
			JSON.stringify({
				success: true,
				item: {
					id: item.id,
					product_id: item.product_id,
					start_at: item.start_at.toISOString(),
					end_at: item.end_at.toISOString(),
					price: item.price,
					deposit: item.deposit,
				},
			}),
			{
				status: 201,
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
