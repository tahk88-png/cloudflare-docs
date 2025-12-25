// Cart management service
// Handles cart creation, items, validation, and expiry

import type { Cart, CartItem, CartValidationResult } from './types';
import { query, transaction } from './db/client';
import { addMinutes } from 'date-fns';
import { calculatePrice } from './pricing';
import { checkAvailability, createCartLock, releaseCartLock, getCartLocks } from './availability';

const CART_TTL_MINUTES = 15; // Cart expires after 15 minutes

/**
 * Create a new cart
 */
export async function createCart(userId?: string): Promise<Cart> {
	const expiresAt = addMinutes(new Date(), CART_TTL_MINUTES);

	const result = await query<Cart>(
		`INSERT INTO carts (user_id, status, expires_at)
		 VALUES ($1, 'active', $2)
		 RETURNING *`,
		[userId || null, expiresAt]
	);

	return result.rows[0];
}

/**
 * Get cart by ID
 */
export async function getCart(cartId: string): Promise<Cart | null> {
	const result = await query<Cart>(
		'SELECT * FROM carts WHERE id = $1',
		[cartId]
	);

	if (result.rows.length === 0) {
		return null;
	}

	const cart = result.rows[0];

	// Check if cart is expired
	if (cart.status === 'active' && cart.expires_at < new Date()) {
		await query(
			'UPDATE carts SET status = $1 WHERE id = $2',
			['expired', cartId]
		);
		cart.status = 'expired';
	}

	return cart;
}

/**
 * Add item to cart
 */
export async function addCartItem(
	cartId: string,
	productId: string,
	startAt: Date,
	endAt: Date
): Promise<CartItem> {
	return transaction(async (client) => {
		// Verify cart exists and is active
		const cartResult = await client.query<Cart>(
			'SELECT * FROM carts WHERE id = $1',
			[cartId]
		);

		if (cartResult.rows.length === 0) {
			throw new Error('Cart not found');
		}

		const cart = cartResult.rows[0];

		if (cart.status !== 'active' || cart.expires_at < new Date()) {
			throw new Error('Cart is expired or not active');
		}

		// Get product
		const productResult = await client.query(
			'SELECT * FROM products WHERE id = $1',
			[productId]
		);

		if (productResult.rows.length === 0) {
			throw new Error('Product not found');
		}

		const product = productResult.rows[0];

		// Calculate price
		const priceBreakdown = calculatePrice({
			product,
			start_at: startAt,
			end_at: endAt,
		});

		// Create cart item
		const itemResult = await client.query<CartItem>(
			`INSERT INTO cart_items (cart_id, product_id, start_at, end_at, price, deposit)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING *`,
			[
				cartId,
				productId,
				startAt,
				endAt,
				priceBreakdown.subtotal,
				priceBreakdown.deposit,
			]
		);

		const item = itemResult.rows[0];

		// Create soft lock
		try {
			await createCartLock(cartId, productId, startAt, endAt);
		} catch (error) {
			// If lock fails, remove the item
			await client.query('DELETE FROM cart_items WHERE id = $1', [item.id]);
			throw error;
		}

		return item;
	});
}

/**
 * Update cart item
 */
export async function updateCartItem(
	cartId: string,
	itemId: string,
	startAt: Date,
	endAt: Date
): Promise<CartItem> {
	return transaction(async (client) => {
		// Get existing item
		const itemResult = await client.query<CartItem>(
			'SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2',
			[itemId, cartId]
		);

		if (itemResult.rows.length === 0) {
			throw new Error('Cart item not found');
		}

		const oldItem = itemResult.rows[0];

		// Get product
		const productResult = await client.query(
			'SELECT * FROM products WHERE id = $1',
			[oldItem.product_id]
		);

		const product = productResult.rows[0];

		// Calculate new price
		const priceBreakdown = calculatePrice({
			product,
			start_at: startAt,
			end_at: endAt,
		});

		// Release old lock
		const oldLocks = await getCartLocks(cartId);
		const oldLock = oldLocks.find(
			(lock) => lock.product_id === oldItem.product_id
		);
		if (oldLock) {
			await client.query('DELETE FROM cart_locks WHERE id = $1', [oldLock.id]);
		}

		// Create new lock
		try {
			await createCartLock(cartId, oldItem.product_id, startAt, endAt);
		} catch (error) {
			throw new Error(
				`Cannot update item: ${error instanceof Error ? error.message : 'Availability check failed'}`
			);
		}

		// Update item
		const updateResult = await client.query<CartItem>(
			`UPDATE cart_items
			 SET start_at = $1, end_at = $2, price = $3, deposit = $4
			 WHERE id = $5
			 RETURNING *`,
			[startAt, endAt, priceBreakdown.subtotal, priceBreakdown.deposit, itemId]
		);

		return updateResult.rows[0];
	});
}

/**
 * Remove item from cart
 */
export async function removeCartItem(cartId: string, itemId: string): Promise<void> {
	return transaction(async (client) => {
		// Get item to find product_id
		const itemResult = await client.query<CartItem>(
			'SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2',
			[itemId, cartId]
		);

		if (itemResult.rows.length === 0) {
			throw new Error('Cart item not found');
		}

		const item = itemResult.rows[0];

		// Delete item
		await client.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

		// Release lock
		const locks = await getCartLocks(cartId);
		const lock = locks.find((l) => l.product_id === item.product_id);
		if (lock) {
			await client.query('DELETE FROM cart_locks WHERE id = $1', [lock.id]);
		}
	});
}

/**
 * Get all items in a cart
 */
export async function getCartItems(cartId: string): Promise<CartItem[]> {
	const result = await query<CartItem>(
		'SELECT * FROM cart_items WHERE cart_id = $1 ORDER BY created_at',
		[cartId]
	);
	return result.rows;
}

/**
 * Validate cart before checkout
 */
export async function validateCart(cartId: string): Promise<CartValidationResult> {
	const cart = await getCart(cartId);

	if (!cart) {
		return {
			valid: false,
			errors: [{ item_id: '', product_id: '', error: 'Cart not found' }],
			warnings: [],
		};
	}

	if (cart.status !== 'active' || cart.expires_at < new Date()) {
		return {
			valid: false,
			errors: [{ item_id: '', product_id: '', error: 'Cart is expired' }],
			warnings: [],
		};
	}

	const items = await getCartItems(cartId);
	const errors: CartValidationResult['errors'] = [];
	const warnings: CartValidationResult['warnings'] = [];

	for (const item of items) {
		// Check availability
		const availability = await checkAvailability(
			item.product_id,
			item.start_at,
			item.end_at
		);

		if (!availability.available) {
			errors.push({
				item_id: item.id,
				product_id: item.product_id,
				error: 'No longer available in the selected time range',
			});
		} else if (availability.available_compartments === 1) {
			warnings.push({
				item_id: item.id,
				product_id: item.product_id,
				warning: 'Only one compartment remaining',
			});
		}

		// Check if time range is valid
		if (item.end_at <= item.start_at) {
			errors.push({
				item_id: item.id,
				product_id: item.product_id,
				error: 'Invalid time range',
			});
		}

		// Check if start time is in the past
		if (item.start_at < new Date()) {
			errors.push({
				item_id: item.id,
				product_id: item.product_id,
				error: 'Start time cannot be in the past',
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Lock cart for checkout (prevent modifications)
 */
export async function lockCart(cartId: string): Promise<void> {
	await query(
		"UPDATE carts SET status = 'locked' WHERE id = $1",
		[cartId]
	);
}

/**
 * Mark cart as completed
 */
export async function completeCart(cartId: string): Promise<void> {
	await query(
		"UPDATE carts SET status = 'completed' WHERE id = $1",
		[cartId]
	);
}
