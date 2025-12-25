import { query, transaction } from './db';
import { AvailabilityResponse } from '../types';

/**
 * Check if any compartment is available for the given product and time range.
 * Checks both 'bookings' (hard reservations) and 'cart_locks' (soft holds).
 */
export async function findAvailableCompartment(
  productId: string,
  startAt: Date,
  endAt: Date,
  excludeCartId?: string
): Promise<string | null> {
  // We look for compartments of the product that do NOT have overlapping bookings or valid locks.
  // Note: pg ranges use [) by default, but we can use explicit overlap checks.
  
  const sql = `
    SELECT c.id
    FROM compartments c
    WHERE c.product_id = $1
      AND c.status = 'available'
      AND NOT EXISTS (
        -- Check confirmed bookings
        SELECT 1 FROM bookings b
        WHERE b.compartment_id = c.id
          AND b.status IN ('confirmed', 'active')
          AND tstzrange(b.start_at, b.end_at) && tstzrange($2, $3)
      )
      AND NOT EXISTS (
        -- Check active cart locks
        SELECT 1 FROM cart_locks cl
        WHERE cl.compartment_id = c.id
          AND cl.expires_at > NOW() -- Only valid locks
          AND (cl.cart_id != $4 OR $4 IS NULL) -- Allow own cart to overlap (if updating)
          AND tstzrange(cl.start_at, cl.end_at) && tstzrange($2, $3)
      )
    LIMIT 1;
  `;

  const result = await query(sql, [productId, startAt, endAt, excludeCartId]);
  return result.rows[0]?.id || null;
}

/**
 * Attempts to lock a compartment for a cart item.
 * This should be called when adding an item to the cart.
 */
export async function lockCompartment(
  cartId: string,
  productId: string,
  startAt: Date,
  endAt: Date
): Promise<AvailabilityResponse> {
  return transaction(async (client) => {
    // 1. Find free compartment
    const compartmentId = await findAvailableCompartment(productId, startAt, endAt, cartId);

    if (!compartmentId) {
      return { available: false, reason: 'No compartments available for this time range.' };
    }

    // 2. Create lock
    // Expiry: Cart TTL (e.g. 15 mins) from now.
    // In a real system, we might want to extend the cart expiry if it's sooner.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

    const insertSql = `
      INSERT INTO cart_locks (cart_id, product_id, compartment_id, start_at, end_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    
    await query(insertSql, [cartId, productId, compartmentId, startAt, endAt, expiresAt]);

    return { available: true, compartment_id: compartmentId };
  });
}

/**
 * Release all locks for a specific cart (e.g. on expiry or checkout completion).
 */
export async function releaseCartLocks(cartId: string) {
    await query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);
}
