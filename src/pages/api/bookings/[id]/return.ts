import type { APIRoute } from "astro";
import type { Booking, ReturnRequest, ReturnResponse } from "../../../../types/booking";
import { getRuntimeEnv } from "../../../../util/runtime";

export const POST: APIRoute = async ({ params, request, locals }) => {
	const bookingId = params.id;
	if (!bookingId) {
		return new Response(JSON.stringify({ error: "Booking ID is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const formData = await request.formData();
		const photos = formData.getAll("photos") as File[];

		// Validate photos (max 3, check file types)
		if (photos.length > 3) {
			return new Response(
				JSON.stringify({ error: "Maximum 3 photos allowed" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Validate photo file types
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		for (const photo of photos) {
			if (photo.size > 0 && !allowedTypes.includes(photo.type)) {
				return new Response(
					JSON.stringify({
						error: `Invalid file type: ${photo.type}. Allowed types: ${allowedTypes.join(", ")}`,
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Get booking from database
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

		// Fetch booking
		const booking = await db
			.prepare("SELECT * FROM bookings WHERE id = ?")
			.bind(bookingId)
			.first<Booking>();

		if (!booking) {
			return new Response(JSON.stringify({ error: "Booking not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if booking has reached end_at
		const endAt = new Date(booking.end_at);
		const now = new Date();
		const isOverdue = now > endAt;

		// Upload photos to R2 if provided
		const photoUrls: string[] = [];
		const r2Bucket = env?.RETURN_PHOTOS_BUCKET;

		if (photos.length > 0 && r2Bucket) {
			for (const photo of photos) {
				if (photo.size > 0) {
					const photoKey = `returns/${bookingId}/${Date.now()}-${photo.name}`;
					await r2Bucket.put(photoKey, photo);
					photoUrls.push(photoKey);
				}
			}
		}

		// Update booking status
		const returnRequestedAt = new Date().toISOString();
		const newStatus = isOverdue ? "overdue" : booking.status;
		const returnStatus = "pending"; // Awaiting admin confirmation

		await db
			.prepare(
				`UPDATE bookings 
				SET return_status = ?, 
					return_requested_at = ?, 
					return_photos = ?,
					status = ?,
					updated_at = ?
				WHERE id = ?`,
			)
			.bind(
				returnStatus,
				returnRequestedAt,
				JSON.stringify(photoUrls),
				newStatus,
				new Date().toISOString(),
				bookingId,
			)
			.run();

		// Fetch updated booking
		const updatedBooking = await db
			.prepare("SELECT * FROM bookings WHERE id = ?")
			.bind(bookingId)
			.first<Booking>();

		const response: ReturnResponse = {
			booking: updatedBooking!,
			overdue: isOverdue,
			message: isOverdue
				? "Return request submitted. This booking is overdue and will be reviewed by an admin."
				: "Return request submitted successfully. Awaiting admin confirmation.",
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error processing return request:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to process return request",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
