// GET /api/admin/carts - Get all carts (admin)
import type { APIRoute } from 'astro';
import { query } from '~/lib/booking/db/client';

export const GET: APIRoute = async ({ request }) => {
	try {
		// In production, verify admin authentication here
		// const authHeader = request.headers.get('authorization');
		// if (!isAdmin(authHeader)) {
		//   return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		// }

		const url = new URL(request.url);
		const status = url.searchParams.get('status') || 'active';
		const limit = parseInt(url.searchParams.get('limit') || '50');

		const result = await query(
			`SELECT c.*, COUNT(ci.id) as item_count
			 FROM carts c
			 LEFT JOIN cart_items ci ON ci.cart_id = c.id
			 WHERE c.status = $1
			 GROUP BY c.id
			 ORDER BY c.created_at DESC
			 LIMIT $2`,
			[status, limit]
		);

		return new Response(
			JSON.stringify({
				success: true,
				carts: result.rows.map((cart) => ({
					id: cart.id,
					user_id: cart.user_id,
					status: cart.status,
					expires_at: cart.expires_at.toISOString(),
					created_at: cart.created_at.toISOString(),
					item_count: parseInt(cart.item_count),
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
