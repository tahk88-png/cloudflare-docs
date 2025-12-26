import type { APIRoute } from "astro";
import type { AdminReturn } from "../../../types/booking";
import { getRuntimeEnv } from "../../../util/runtime";

export const GET: APIRoute = async ({ request, locals }) => {
	try {
		// Check admin authentication (you should implement proper auth)
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const env = getRuntimeEnv(locals);
		const db = env?.DB;
		if (!db) {
			return new Response(
				JSON.stringify({ error: "Database not available" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Get query parameters
		const url = new URL(request.url);
		const status = url.searchParams.get("status"); // Filter by return_status
		const overdue = url.searchParams.get("overdue"); // Filter overdue only

		// Build query
		let query = `
			SELECT 
				b.id as booking_id,
				b.user_id,
				b.tool_id,
				b.end_at,
				b.return_requested_at,
				b.return_confirmed_at,
				b.return_status,
				b.return_photos,
				b.admin_notes,
				t.name as tool_name,
				u.email as user_email
			FROM bookings b
			LEFT JOIN tools t ON b.tool_id = t.id
			LEFT JOIN users u ON b.user_id = u.id
			WHERE b.return_status IS NOT NULL
		`;

		const bindings: any[] = [];

		if (status) {
			query += " AND b.return_status = ?";
			bindings.push(status);
		}

		if (overdue === "true") {
			query += " AND b.end_at < datetime('now')";
		}

		query += " ORDER BY b.return_requested_at DESC";

		const result = await db.prepare(query).bind(...bindings).all();

		const returns: AdminReturn[] = (result.results || []).map((row: any) => {
			const endAt = new Date(row.end_at);
			const now = new Date();
			const isOverdue = now > endAt;
			const daysOverdue = isOverdue
				? Math.floor((now.getTime() - endAt.getTime()) / (1000 * 60 * 60 * 24))
				: 0;

			return {
				booking_id: row.booking_id,
				user_id: row.user_id,
				tool_id: row.tool_id,
				tool_name: row.tool_name,
				user_email: row.user_email,
				end_at: row.end_at,
				return_requested_at: row.return_requested_at,
				return_confirmed_at: row.return_confirmed_at,
				return_status: row.return_status,
				return_photos: row.return_photos
					? JSON.parse(row.return_photos)
					: undefined,
				overdue: isOverdue,
				days_overdue: daysOverdue,
				admin_notes: row.admin_notes,
			};
		});

		return new Response(JSON.stringify({ returns }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching returns:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to fetch returns",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

// Admin can approve or flag issues
export const PATCH: APIRoute = async ({ request, locals }) => {
	try {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();
		const { booking_id, action, admin_notes } = body;

		if (!booking_id || !action) {
			return new Response(
				JSON.stringify({
					error: "booking_id and action are required",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (!["approved", "disputed"].includes(action)) {
			return new Response(
				JSON.stringify({
					error: "action must be 'approved' or 'disputed'",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const env = getRuntimeEnv(locals);
		const db = env?.DB;
		if (!db) {
			return new Response(
				JSON.stringify({ error: "Database not available" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Update booking return status
		await db
			.prepare(
				`UPDATE bookings 
				SET return_status = ?,
					return_confirmed_at = ?,
					admin_notes = ?,
					status = CASE 
						WHEN ? = 'approved' THEN 'returned'
						ELSE status
					END,
					updated_at = ?
				WHERE id = ?`,
			)
			.bind(
				action,
				new Date().toISOString(),
				admin_notes || null,
				action,
				new Date().toISOString(),
				booking_id,
			)
			.run();

		return new Response(
			JSON.stringify({
				success: true,
				message: `Return ${action} successfully`,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error updating return status:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to update return status",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
