// ═══════════════════════════════════════════════════════════════════════════
// AVAILABILITY & LOCKING SERVICE
// Handles compartment availability checks and soft locking
// ═══════════════════════════════════════════════════════════════════════════

import { PoolClient } from 'pg';
import { 
  query, 
  queryOne, 
  queryMany, 
  withTransaction, 
  txQueryOne, 
  txQueryMany,
  generateLockId,
  acquireLock 
} from '../db/index.js';
import type { Compartment, CartLock } from '../types/index.js';
import { AvailabilityError, ConflictError } from '../types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// AVAILABILITY CHECKING
// ═══════════════════════════════════════════════════════════════════════════

export interface AvailabilityResult {
  available: boolean;
  compartment_id?: string;
  reason?: string;
  alternatives?: AlternativeSlot[];
}

export interface AlternativeSlot {
  start_at: Date;
  end_at: Date;
  compartment_id: string;
}

/**
 * Check if a product is available for a given time range
 * Returns the first available compartment or availability info
 */
export async function checkProductAvailability(
  productId: string,
  startAt: Date,
  endAt: Date,
  excludeCartId?: string
): Promise<AvailabilityResult> {
  // Find an available compartment
  const compartment = await findAvailableCompartment(
    productId,
    startAt,
    endAt,
    excludeCartId
  );
  
  if (compartment) {
    return {
      available: true,
      compartment_id: compartment.id,
    };
  }
  
  // No availability - try to find alternatives
  const alternatives = await findAlternativeSlots(productId, startAt, endAt);
  
  return {
    available: false,
    reason: 'No compartments available for the selected time range',
    alternatives,
  };
}

/**
 * Find an available compartment for a product
 */
export async function findAvailableCompartment(
  productId: string,
  startAt: Date,
  endAt: Date,
  excludeCartId?: string
): Promise<Compartment | null> {
  const result = await queryOne<Compartment>(`
    SELECT c.*
    FROM compartments c
    WHERE c.product_id = $1
    AND c.is_active = true
    AND NOT EXISTS (
      -- Check for conflicting bookings
      SELECT 1 FROM bookings b
      WHERE b.compartment_id = c.id
      AND b.status IN ('confirmed', 'active', 'extended')
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange($2, $3, '[)')
    )
    AND NOT EXISTS (
      -- Check for conflicting locks (excluding current cart)
      SELECT 1 FROM cart_locks cl
      WHERE cl.compartment_id = c.id
      AND cl.expires_at > NOW()
      ${excludeCartId ? 'AND cl.cart_id != $4' : ''}
      AND tstzrange(cl.start_at, cl.end_at, '[)') && tstzrange($2, $3, '[)')
    )
    LIMIT 1
  `, excludeCartId 
    ? [productId, startAt.toISOString(), endAt.toISOString(), excludeCartId]
    : [productId, startAt.toISOString(), endAt.toISOString()]
  );
  
  return result;
}

/**
 * Find alternative available time slots
 */
async function findAlternativeSlots(
  productId: string,
  desiredStart: Date,
  desiredEnd: Date,
  limit: number = 3
): Promise<AlternativeSlot[]> {
  // This is a simplified version - in production, you'd want more sophisticated
  // slot finding based on booking patterns
  const duration = desiredEnd.getTime() - desiredStart.getTime();
  const alternatives: AlternativeSlot[] = [];
  
  // Try slots starting from after the desired period
  let searchStart = new Date(desiredEnd);
  
  for (let i = 0; i < 7 && alternatives.length < limit; i++) {
    const searchEnd = new Date(searchStart.getTime() + duration);
    
    const compartment = await findAvailableCompartment(
      productId,
      searchStart,
      searchEnd
    );
    
    if (compartment) {
      alternatives.push({
        start_at: searchStart,
        end_at: searchEnd,
        compartment_id: compartment.id,
      });
    }
    
    // Move to next day
    searchStart = new Date(searchStart.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return alternatives;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOFT LOCKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a soft lock on a compartment for a cart item
 */
export async function createLock(
  cartId: string,
  cartItemId: string,
  productId: string,
  compartmentId: string,
  startAt: Date,
  endAt: Date,
  expiresAt: Date
): Promise<CartLock> {
  const result = await queryOne<CartLock>(`
    INSERT INTO cart_locks (
      cart_id, cart_item_id, product_id, compartment_id,
      start_at, end_at, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [cartId, cartItemId, productId, compartmentId, 
      startAt.toISOString(), endAt.toISOString(), expiresAt.toISOString()]);
  
  if (!result) {
    throw new Error('Failed to create lock');
  }
  
  console.log(`Created lock for compartment ${compartmentId} until ${expiresAt}`);
  
  return result;
}

/**
 * Create a soft lock within a transaction
 */
export async function createLockTx(
  client: PoolClient,
  cartId: string,
  cartItemId: string,
  productId: string,
  compartmentId: string,
  startAt: Date,
  endAt: Date,
  expiresAt: Date
): Promise<CartLock> {
  const result = await txQueryOne<CartLock>(client, `
    INSERT INTO cart_locks (
      cart_id, cart_item_id, product_id, compartment_id,
      start_at, end_at, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [cartId, cartItemId, productId, compartmentId, 
      startAt.toISOString(), endAt.toISOString(), expiresAt.toISOString()]);
  
  if (!result) {
    throw new Error('Failed to create lock');
  }
  
  return result;
}

/**
 * Release a lock for a cart item
 */
export async function releaseLock(cartItemId: string): Promise<void> {
  await query('DELETE FROM cart_locks WHERE cart_item_id = $1', [cartItemId]);
}

/**
 * Release all locks for a cart
 */
export async function releaseCartLocks(cartId: string): Promise<void> {
  await query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);
}

/**
 * Extend lock expiry (when cart is extended)
 */
export async function extendLocks(cartId: string, newExpiresAt: Date): Promise<void> {
  await query(`
    UPDATE cart_locks 
    SET expires_at = $2 
    WHERE cart_id = $1 AND expires_at > NOW()
  `, [cartId, newExpiresAt.toISOString()]);
}

/**
 * Get all active locks for a cart
 */
export async function getCartLocks(cartId: string): Promise<CartLock[]> {
  return queryMany<CartLock>(`
    SELECT * FROM cart_locks 
    WHERE cart_id = $1 AND expires_at > NOW()
  `, [cartId]);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCK VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify that all locks for a cart are still valid
 */
export async function verifyCartLocks(cartId: string): Promise<{
  valid: boolean;
  invalidItems: string[];
}> {
  const locks = await getCartLocks(cartId);
  const invalidItems: string[] = [];
  
  for (const lock of locks) {
    // Check if lock has expired
    if (new Date(lock.expires_at) < new Date()) {
      invalidItems.push(lock.cart_item_id);
      continue;
    }
    
    // Verify no conflicting bookings were created
    const hasConflict = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM bookings
        WHERE compartment_id = $1
        AND status IN ('confirmed', 'active', 'extended')
        AND tstzrange(start_at, end_at, '[)') && tstzrange($2, $3, '[)')
      ) as exists
    `, [lock.compartment_id, lock.start_at, lock.end_at]);
    
    if (hasConflict?.exists) {
      invalidItems.push(lock.cart_item_id);
    }
  }
  
  return {
    valid: invalidItems.length === 0,
    invalidItems,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ATOMIC LOCK ACQUISITION (for checkout)
// ═══════════════════════════════════════════════════════════════════════════

export interface LockAcquisitionResult {
  success: boolean;
  locks: CartLock[];
  failures: {
    cartItemId: string;
    productId: string;
    reason: string;
  }[];
}

/**
 * Atomically acquire locks for all cart items
 * Used during checkout to ensure all items are still available
 */
export async function acquireCheckoutLocks(
  cartId: string,
  items: {
    id: string;
    product_id: string;
    start_at: Date;
    end_at: Date;
  }[],
  expiresAt: Date
): Promise<LockAcquisitionResult> {
  return withTransaction(async (client) => {
    const locks: CartLock[] = [];
    const failures: LockAcquisitionResult['failures'] = [];
    
    // First, release any existing locks for this cart
    await client.query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);
    
    for (const item of items) {
      // Acquire advisory lock to prevent race conditions
      const lockId = generateLockId(`product:${item.product_id}`);
      await acquireLock(client, lockId);
      
      // Find available compartment
      const compartment = await txQueryOne<Compartment>(client, `
        SELECT c.*
        FROM compartments c
        WHERE c.product_id = $1
        AND c.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.compartment_id = c.id
          AND b.status IN ('confirmed', 'active', 'extended')
          AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange($2, $3, '[)')
        )
        AND NOT EXISTS (
          SELECT 1 FROM cart_locks cl
          WHERE cl.compartment_id = c.id
          AND cl.expires_at > NOW()
          AND cl.cart_id != $4
          AND tstzrange(cl.start_at, cl.end_at, '[)') && tstzrange($2, $3, '[)')
        )
        FOR UPDATE
        LIMIT 1
      `, [item.product_id, item.start_at.toISOString(), item.end_at.toISOString(), cartId]);
      
      if (!compartment) {
        failures.push({
          cartItemId: item.id,
          productId: item.product_id,
          reason: 'No available compartment for the selected time range',
        });
        continue;
      }
      
      // Create lock
      const lock = await createLockTx(
        client,
        cartId,
        item.id,
        item.product_id,
        compartment.id,
        item.start_at,
        item.end_at,
        expiresAt
      );
      
      locks.push(lock);
    }
    
    // If any failures, rollback all locks
    if (failures.length > 0) {
      throw new AvailabilityError(
        'Some items are no longer available',
        { failures }
      );
    }
    
    return {
      success: true,
      locks,
      failures: [],
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING CREATION (after payment)
// ═══════════════════════════════════════════════════════════════════════════

export interface BookingCreationItem {
  cartItemId: string;
  productId: string;
  compartmentId: string;
  startAt: Date;
  endAt: Date;
  totalPrice: number;
  depositAmount: number;
  priceBreakdown: Record<string, unknown>;
}

/**
 * Create bookings from cart locks (after payment confirmation)
 * This is the final step that converts soft locks to hard bookings
 */
export async function createBookingsFromLocks(
  cartId: string,
  userId: string | null,
  items: BookingCreationItem[]
): Promise<string[]> {
  return withTransaction(async (client) => {
    const bookingIds: string[] = [];
    
    for (const item of items) {
      // Acquire advisory lock for the compartment
      const lockId = generateLockId(`compartment:${item.compartmentId}`);
      await acquireLock(client, lockId);
      
      // Final availability check with row-level lock
      const isAvailable = await txQueryOne<{ available: boolean }>(client, `
        SELECT NOT EXISTS (
          SELECT 1 FROM bookings
          WHERE compartment_id = $1
          AND status IN ('confirmed', 'active', 'extended')
          AND tstzrange(start_at, end_at, '[)') && tstzrange($2, $3, '[)')
        ) as available
      `, [item.compartmentId, item.startAt.toISOString(), item.endAt.toISOString()]);
      
      if (!isAvailable?.available) {
        throw new ConflictError(
          'Compartment is no longer available. This should not happen - please contact support.',
          { compartmentId: item.compartmentId }
        );
      }
      
      // Generate access codes
      const pickupCode = generateAccessCode();
      const returnCode = generateAccessCode();
      
      // Create booking
      const booking = await txQueryOne<{ id: string }>(client, `
        INSERT INTO bookings (
          user_id, cart_id, product_id, compartment_id,
          start_at, end_at, status,
          total_price, deposit_amount, price_breakdown,
          pickup_code, return_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        userId,
        cartId,
        item.productId,
        item.compartmentId,
        item.startAt.toISOString(),
        item.endAt.toISOString(),
        item.totalPrice,
        item.depositAmount,
        JSON.stringify(item.priceBreakdown),
        pickupCode,
        returnCode,
      ]);
      
      if (!booking) {
        throw new Error('Failed to create booking');
      }
      
      bookingIds.push(booking.id);
    }
    
    // Delete locks for this cart (they're now bookings)
    await client.query('DELETE FROM cart_locks WHERE cart_id = $1', [cartId]);
    
    // Update cart status
    await client.query(
      `UPDATE carts SET status = 'completed' WHERE id = $1`,
      [cartId]
    );
    
    return bookingIds;
  });
}

/**
 * Generate a random 6-digit access code
 */
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION AVAILABILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a booking can be extended to a new end time
 */
export async function checkExtensionAvailability(
  bookingId: string,
  compartmentId: string,
  currentEndAt: Date,
  newEndAt: Date
): Promise<{
  available: boolean;
  reason?: string;
  maxExtensionTime?: Date;
}> {
  // Find next booking or lock for this compartment
  const nextBooking = await queryOne<{ start_at: Date }>(`
    SELECT start_at FROM bookings
    WHERE compartment_id = $1
    AND id != $2
    AND status IN ('confirmed', 'active', 'extended')
    AND start_at > $3
    ORDER BY start_at ASC
    LIMIT 1
  `, [compartmentId, bookingId, currentEndAt.toISOString()]);
  
  if (nextBooking && new Date(nextBooking.start_at) < newEndAt) {
    return {
      available: false,
      reason: 'Another booking starts before your requested extension time',
      maxExtensionTime: new Date(nextBooking.start_at),
    };
  }
  
  // Check for locks
  const nextLock = await queryOne<{ start_at: Date }>(`
    SELECT start_at FROM cart_locks
    WHERE compartment_id = $1
    AND expires_at > NOW()
    AND start_at > $2
    ORDER BY start_at ASC
    LIMIT 1
  `, [compartmentId, currentEndAt.toISOString()]);
  
  if (nextLock && new Date(nextLock.start_at) < newEndAt) {
    return {
      available: false,
      reason: 'The compartment is reserved for another customer',
      maxExtensionTime: new Date(nextLock.start_at),
    };
  }
  
  return { available: true };
}
