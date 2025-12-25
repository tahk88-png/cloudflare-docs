// GET /api/cart/:id - Get cart details
import type { APIRoute } from 'astro';
import { getCart, getCartItems } from '~/lib/booking/cart';
import { getCartLocks } from '~/lib/booking/availability';

export const GET: APIRoute = async ({ params }) => {
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

		const cart = await getCart(cartId);

		if (!cart) {
			return new Response(
				JSON.stringify({ success: false, error: 'Cart not found' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const items = await getCartItems(cartId);
		const locks = await getCartLocks(cartId);

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
				items: items.map((item) => ({
					id: item.id,
					product_id: item.product_id,
					start_at: item.start_at.toISOString(),
					end_at: item.end_at.toISOString(),
					price: item.price,
					deposit: item.deposit,
				})),
				locks: locks.map((lock) => ({
					id: lock.id,
					product_id: lock.product_id,
					compartment_id: lock.compartment_id,
					start_at: lock.start_at.toISOString(),
					end_at: lock.end_at.toISOString(),
					expires_at: lock.expires_at.toISOString(),
				})),
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
