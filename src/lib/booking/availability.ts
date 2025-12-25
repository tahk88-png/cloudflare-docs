// Availability checking and soft locking logic
// Prevents double-booking and overselling

import type { AvailabilityCheck, CartLock, Product } from './types';
import { query, transaction } from './db/client';
import { addMinutes } from 'date-fns';

const CART_LOCK_TTL_MINUTES = 15; // Locks expire after 15 minutes

/**
 * Check availability for a product in a time range
 */
export async function checkAvailability(
	productId: string,
	startAt: Date,
	endAt: Date,
	excludeBookingId?: string
): Promise<AvailabilityCheck> {
	// Get product info
	const productResult = await query<Product>(
		'SELECT * FROM products WHERE id = $1',
		[productId]
	);

	if (productResult.rows.length === 0) {
		return {
			available: false,
			available_compartments: 0,
			product_id: productId,
			start_at: startAt,
			end_at: endAt,
		};
	}

	const product = productResult.rows[0];

	// Check available compartments using the database function
	const availabilityResult = await query<{
		compartment_id: string;
		compartment_number: string;
		is_available: boolean;
	}>(
		`SELECT * FROM check_compartment_availability($1, $2, $3, $4)`,
		[productId, startAt, endAt, excludeBookingId || null]
	);

	const availableCompartments = availabilityResult.rows.filter(
		(row) => row.is_available
	);

	return {
		available: availableCompartments.length > 0,
		available_compartments: availableCompartments.length,
		product_id: productId,
		start_at: startAt,
		end_at: endAt,
	};
}

/**
 * Create a soft lock for a cart item
 * Returns the locked compartment_id
 */
export async function createCartLock(
	cartId: string,
	productId: string,
	startAt: Date,
	endAt: Date
): Promise<{ lockId: string; compartmentId: string }> {
	return transaction(async (client) => {
		// Check availability first
		const availability = await checkAvailability(productId, startAt, endAt);

		if (!availability.available) {
			throw new Error(
				`No available compartments for product ${productId} in the requested time range`
			);
		}

		// Get first available compartment
		const compartmentResult = await client.query<{
			compartment_id: string;
			compartment_number: string;
			is_available: boolean;
		}>(
			`SELECT * FROM check_compartment_availability($1, $2, $3, NULL) WHERE is_available = true LIMIT 1`,
			[productId, startAt, endAt]
		);

		if (compartmentResult.rows.length === 0) {
			throw new Error('No available compartments found');
		}

		const compartmentId = compartmentResult.rows[0].compartment_id;
		const expiresAt = addMinutes(new Date(), CART_LOCK_TTL_MINUTES);

		// Create lock
		const lockResult = await client.query<CartLock>(
			`INSERT INTO cart_locks (cart_id, product_id, compartment_id, start_at, end_at, expires_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING *`,
			[cartId, productId, compartmentId, startAt, endAt, expiresAt]
		);

		return {
			lockId: lockResult.rows[0].id,
			compartmentId,
		};
	});
}

/**
 * Release a cart lock
 */
export async function releaseCartLock(lockId: string): Promise<void> {
	await query('DELETE FROM cart_locks WHERE id = $1', [lockId]);
}

/**
 * Release all locks for a cart
 */
export async function releaseCartLocks(cartId: string): Promise<void> {
	await query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);
}

/**
 * Clean up expired locks (should be run periodically)
 */
export async function cleanupExpiredLocks(): Promise<number> {
	const result = await query(
		'DELETE FROM cart_locks WHERE expires_at < NOW() RETURNING id'
	);
	return result.rowCount || 0;
}

/**
 * Check if a lock is still valid
 */
export async function isLockValid(lockId: string): Promise<boolean> {
	const result = await query<CartLock>(
		'SELECT * FROM cart_locks WHERE id = $1 AND expires_at > NOW()',
		[lockId]
	);
	return result.rows.length > 0;
}

/**
 * Get all locks for a cart
 */
export async function getCartLocks(cartId: string): Promise<CartLock[]> {
	const result = await query<CartLock>(
		`SELECT cl.* FROM cart_locks cl
		 WHERE cl.cart_id = $1 AND cl.expires_at > NOW()`,
		[cartId]
	);
	return result.rows;
}
