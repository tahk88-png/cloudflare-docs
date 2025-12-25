// Booking service
// Handles booking creation, extension, and management

import type { Booking, ExtendRentalRequest, ExtendRentalResponse } from './types';
import { query, transaction } from './db/client';
import { checkAvailability } from './availability';
import { calculatePrice } from './pricing';

/**
 * Create booking from cart items
 * This is called after payment confirmation
 */
export async function createBookingFromCart(
	userId: string,
	cartId: string
): Promise<Booking[]> {
	return transaction(async (client) => {
		// Get cart items
		const itemsResult = await client.query(
			`SELECT ci.*, cl.compartment_id
			 FROM cart_items ci
			 JOIN cart_locks cl ON cl.cart_id = ci.cart_id AND cl.product_id = ci.product_id
			 WHERE ci.cart_id = $1`,
			[cartId]
		);

		if (itemsResult.rows.length === 0) {
			throw new Error('No items found in cart');
		}

		const bookings: Booking[] = [];

		// Create booking for each item
		for (const item of itemsResult.rows) {
			// Final availability check in transaction
			const availability = await checkAvailability(
				item.product_id,
				item.start_at,
				item.end_at
			);

			if (!availability.available) {
				throw new Error(
					`Product ${item.product_id} is no longer available in the requested time range`
				);
			}

			// Create booking
			const bookingResult = await client.query<Booking>(
				`INSERT INTO bookings (
					user_id, product_id, compartment_id, start_at, end_at,
					status, total_price, deposit
				)
				VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7)
				RETURNING *`,
				[
					userId,
					item.product_id,
					item.compartment_id,
					item.start_at,
					item.end_at,
					item.price,
					item.deposit,
				]
			);

			bookings.push(bookingResult.rows[0]);
		}

		return bookings;
	});
}

/**
 * Get booking by ID
 */
export async function getBooking(bookingId: string): Promise<Booking | null> {
	const result = await query<Booking>(
		'SELECT * FROM bookings WHERE id = $1',
		[bookingId]
	);
	return result.rows[0] || null;
}

/**
 * Get user bookings
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
	const result = await query<Booking>(
		`SELECT * FROM bookings
		 WHERE user_id = $1
		 ORDER BY start_at DESC`,
		[userId]
	);
	return result.rows;
}

/**
 * Extend rental
 */
export async function extendRental(
	request: ExtendRentalRequest
): Promise<ExtendRentalResponse> {
	return transaction(async (client) => {
		// Get existing booking
		const bookingResult = await client.query<Booking>(
			'SELECT * FROM bookings WHERE id = $1',
			[request.booking_id]
		);

		if (bookingResult.rows.length === 0) {
			return {
				success: false,
				booking_id: request.booking_id,
				original_end_at: new Date(),
				new_end_at: request.new_end_at,
				error: 'Booking not found',
			};
		}

		const booking = bookingResult.rows[0];
		const bookingEndAt = typeof booking.end_at === 'string' 
			? new Date(booking.end_at) 
			: booking.end_at;

		if (booking.status !== 'confirmed' && booking.status !== 'active') {
			return {
				success: false,
				booking_id: request.booking_id,
				original_end_at: bookingEndAt,
				new_end_at: request.new_end_at,
				error: 'Booking cannot be extended',
			};
		}
		
		if (request.new_end_at <= bookingEndAt) {
			return {
				success: false,
				booking_id: request.booking_id,
				original_end_at: bookingEndAt,
				new_end_at: request.new_end_at,
				error: 'New end time must be after current end time',
			};
		}

		// Check availability for extension (bookingEndAt already defined above)
		const availability = await checkAvailability(
			booking.product_id,
			bookingEndAt,
			request.new_end_at,
			booking.id // Exclude current booking
		);

		if (!availability.available) {
			return {
				success: false,
				booking_id: request.booking_id,
				original_end_at: bookingEndAt,
				new_end_at: request.new_end_at,
				error: 'Compartment not available for extension',
				suggested_alternatives: availability.suggested_alternatives,
			};
		}

		// Get product for pricing
		const productResult = await client.query(
			'SELECT * FROM products WHERE id = $1',
			[booking.product_id]
		);

		if (productResult.rows.length === 0) {
			return {
				success: false,
				booking_id: request.booking_id,
				original_end_at: booking.end_at,
				new_end_at: request.new_end_at,
				error: 'Product not found',
			};
		}

		const product = productResult.rows[0];

		// Calculate additional cost
		const priceBreakdown = calculatePrice({
			product,
			start_at: bookingEndAt,
			end_at: request.new_end_at,
		});

		const additionalCost = priceBreakdown.subtotal;

		// Update booking
		await client.query(
			`UPDATE bookings
			 SET end_at = $1, total_price = total_price + $2
			 WHERE id = $3`,
			[request.new_end_at, additionalCost, booking.id]
		);

		return {
			success: true,
			booking_id: request.booking_id,
			original_end_at: bookingEndAt,
			new_end_at: request.new_end_at,
			additional_cost: additionalCost,
		};
	});
}
