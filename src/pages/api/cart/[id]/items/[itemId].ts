// PUT /api/cart/:id/items/:itemId - Update cart item
// DELETE /api/cart/:id/items/:itemId - Remove cart item
import type { APIRoute } from 'astro';
import { updateCartItem, removeCartItem } from '~/lib/booking/cart';

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const cartId = params.id;
		const itemId = params.itemId;

		if (!cartId || !itemId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cart ID and Item ID are required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const body = await request.json();
		const { start_at, end_at } = body;

		if (!start_at || !end_at) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'start_at and end_at are required',
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const item = await updateCartItem(
			cartId,
			itemId,
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

export const DELETE: APIRoute = async ({ params }) => {
	try {
		const cartId = params.id;
		const itemId = params.itemId;

		if (!cartId || !itemId) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cart ID and Item ID are required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		await removeCartItem(cartId, itemId);

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Item removed from cart',
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
