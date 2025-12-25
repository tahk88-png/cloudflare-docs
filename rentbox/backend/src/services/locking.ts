import db, { DbClient } from '../db/connection.js';
import { CartLock } from '../types/index.js';
import { AvailabilityError, ConflictError } from '../utils/errors.js';
import availabilityService from './availability.js';

export class LockingService {
  /**
   * Create a lock for a cart item
   * This reserves a compartment for the duration of the cart's lifetime
   */
  async createLock(
    cartId: string,
    cartItemId: string,
    productId: string,
    startAt: Date,
    endAt: Date,
    client?: DbClient
  ): Promise<CartLock> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    // Get cart expiry
    const cartResult = await queryFn(
      `SELECT expires_at FROM carts WHERE id = $1`,
      [cartId]
    );
    
    if (cartResult.rows.length === 0) {
      throw new Error('Cart not found');
    }
    
    const cartExpiresAt = cartResult.rows[0].expires_at;
    
    // Find available compartment
    const compartment = await availabilityService.getAvailableCompartment(
      productId,
      startAt,
      endAt,
      cartId
    );
    
    // Create lock
    const result = await queryFn(
      `INSERT INTO cart_locks (
        cart_id, cart_item_id, product_id, compartment_id,
        start_at, end_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        cartId,
        cartItemId,
        productId,
        compartment.compartment_id,
        startAt,
        endAt,
        cartExpiresAt,
      ]
    );
    
    return result.rows[0];
  }
  
  /**
   * Release a specific lock
   */
  async releaseLock(lockId: string, client?: DbClient): Promise<void> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    await queryFn(
      `DELETE FROM cart_locks WHERE id = $1`,
      [lockId]
    );
  }
  
  /**
   * Release all locks for a cart item
   */
  async releaseItemLocks(cartItemId: string, client?: DbClient): Promise<void> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    await queryFn(
      `DELETE FROM cart_locks WHERE cart_item_id = $1`,
      [cartItemId]
    );
  }
  
  /**
   * Release all locks for a cart
   */
  async releaseCartLocks(cartId: string, client?: DbClient): Promise<void> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    await queryFn(
      `DELETE FROM cart_locks WHERE cart_id = $1`,
      [cartId]
    );
  }
  
  /**
   * Update lock time range (when cart item is modified)
   */
  async updateLock(
    cartItemId: string,
    newStartAt: Date,
    newEndAt: Date,
    client?: DbClient
  ): Promise<CartLock> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    // Get existing lock
    const existingLockResult = await queryFn(
      `SELECT * FROM cart_locks WHERE cart_item_id = $1`,
      [cartItemId]
    );
    
    if (existingLockResult.rows.length === 0) {
      throw new Error('Lock not found');
    }
    
    const existingLock = existingLockResult.rows[0];
    
    // Check if the same compartment is still available
    const compartmentAvailable = await this.isCompartmentAvailable(
      existingLock.compartment_id,
      newStartAt,
      newEndAt,
      existingLock.cart_id
    );
    
    if (!compartmentAvailable) {
      // Need to find a new compartment
      await this.releaseItemLocks(cartItemId, client);
      
      return await this.createLock(
        existingLock.cart_id,
        cartItemId,
        existingLock.product_id,
        newStartAt,
        newEndAt,
        client
      );
    }
    
    // Update existing lock
    const result = await queryFn(
      `UPDATE cart_locks 
       SET start_at = $1, end_at = $2, updated_at = NOW()
       WHERE cart_item_id = $3
       RETURNING *`,
      [newStartAt, newEndAt, cartItemId]
    );
    
    return result.rows[0];
  }
  
  /**
   * Check if a specific compartment is available
   */
  private async isCompartmentAvailable(
    compartmentId: string,
    startAt: Date,
    endAt: Date,
    excludeCartId?: string
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM (
        SELECT compartment_id FROM bookings
        WHERE compartment_id = $1
          AND status IN ('confirmed', 'active', 'in_progress')
          AND (start_at, end_at) OVERLAPS ($2, $3)
        UNION
        SELECT compartment_id FROM cart_locks cl
        JOIN carts c ON c.id = cl.cart_id
        WHERE cl.compartment_id = $1
          AND cl.expires_at > NOW()
          AND c.status = 'active'
          AND ($4 IS NULL OR cl.cart_id != $4)
          AND (cl.start_at, cl.end_at) OVERLAPS ($2, $3)
      ) AS conflicts
      LIMIT 1`,
      [compartmentId, startAt, endAt, excludeCartId || null]
    );
    
    return result.rows.length === 0;
  }
  
  /**
   * Get all locks for a cart
   */
  async getCartLocks(cartId: string): Promise<CartLock[]> {
    const result = await db.query(
      `SELECT * FROM cart_locks WHERE cart_id = $1 ORDER BY created_at`,
      [cartId]
    );
    
    return result.rows;
  }
  
  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await db.query(
      `DELETE FROM cart_locks WHERE expires_at < NOW()`
    );
    
    return result.rowCount || 0;
  }
  
  /**
   * Extend lock expiry (when cart TTL is extended)
   */
  async extendLockExpiry(
    cartId: string,
    newExpiresAt: Date,
    client?: DbClient
  ): Promise<void> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    await queryFn(
      `UPDATE cart_locks 
       SET expires_at = $1 
       WHERE cart_id = $2 AND expires_at < $1`,
      [newExpiresAt, cartId]
    );
  }
}

export default new LockingService();
