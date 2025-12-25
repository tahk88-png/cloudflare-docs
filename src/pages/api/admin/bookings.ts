// GET /api/admin/bookings - Get all bookings (admin)
import type { APIRoute } from 'astro';
import { query } from '~/lib/booking/db/client';

export const GET: APIRoute = async ({ request }) => {
	try {
		// In production, verify admin authentication here

		const url = new URL(request.url);
		const status = url.searchParams.get('status');
		const productId = url.searchParams.get('product_id');
		const limit = parseInt(url.searchParams.get('limit') || '100');

		let queryText = `
			SELECT b.*, p.name as product_name, c.compartment_number
			FROM bookings b
			JOIN products p ON p.id = b.product_id
			JOIN compartments c ON c.id = b.compartment_id
			WHERE 1=1
		`;
		const params: any[] = [];
		let paramIndex = 1;

		if (status) {
			queryText += ` AND b.status = $${paramIndex++}`;
			params.push(status);
		}

		if (productId) {
			queryText += ` AND b.product_id = $${paramIndex++}`;
			params.push(productId);
		}

		queryText += ` ORDER BY b.start_at DESC LIMIT $${paramIndex++}`;
		params.push(limit);

		const result = await query(queryText, params);

		return new Response(
			JSON.stringify({
				success: true,
				bookings: result.rows.map((booking) => ({
					id: booking.id,
					user_id: booking.user_id,
					product_id: booking.product_id,
					product_name: booking.product_name,
					compartment_id: booking.compartment_id,
					compartment_number: booking.compartment_number,
					start_at: booking.start_at.toISOString(),
					end_at: booking.end_at.toISOString(),
					status: booking.status,
					total_price: booking.total_price,
					deposit: booking.deposit,
					created_at: booking.created_at.toISOString(),
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
