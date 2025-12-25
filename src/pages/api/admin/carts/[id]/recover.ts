// POST /api/admin/carts/:id/recover - Recover stuck cart (admin)
import type { APIRoute } from 'astro';
import { query } from '~/lib/booking/db/client';

export const POST: APIRoute = async ({ params }) => {
	try {
		// In production, verify admin authentication here

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

		// Release locks
		await query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);

		// Reset cart status
		await query(
			"UPDATE carts SET status = 'active', expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $1",
			[cartId]
		);

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Cart recovered',
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
