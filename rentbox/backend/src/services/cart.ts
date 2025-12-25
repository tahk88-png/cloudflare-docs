import db, { DbClient } from '../db/connection.js';
import { Cart, CartItem, Product } from '../types/index.js';
import { NotFoundError, ValidationError, CartExpiredError } from '../utils/errors.js';
import { validateTimeRange } from '../utils/validators.js';
import availabilityService from './availability.js';
import lockingService from './locking.js';
import pricingService from './pricing.js';
import { addMinutes } from 'date-fns';

export class CartService {
  private readonly CART_TTL_MINUTES = Number(process.env.CART_TTL_MINUTES) || 15;
  private readonly MAX_CART_ITEMS = Number(process.env.MAX_CART_ITEMS) || 10;
  
  /**
   * Create a new cart
   */
  async createCart(userId?: string, sessionId?: string): Promise<Cart> {
    const expiresAt = addMinutes(new Date(), this.CART_TTL_MINUTES);
    
    const result = await db.query<Cart>(
      `INSERT INTO carts (user_id, session_id, status, expires_at)
       VALUES ($1, $2, 'active', $3)
       RETURNING *`,
      [userId || null, sessionId || null, expiresAt]
    );
    
    return result.rows[0];
  }
  
  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<Cart> {
    const result = await db.query<Cart>(
      `SELECT * FROM carts WHERE id = $1`,
      [cartId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Cart', cartId);
    }
    
    const cart = result.rows[0];
    
    // Check if expired
    if (cart.status === 'active' && new Date(cart.expires_at) < new Date()) {
      await this.expireCart(cartId);
      throw new CartExpiredError();
    }
    
    return cart;
  }
  
  /**
   * Get cart with items
   */
  async getCartWithItems(cartId: string): Promise<Cart & { items: CartItem[] }> {
    const cart = await this.getCart(cartId);
    const items = await this.getCartItems(cartId);
    
    return { ...cart, items };
  }
  
  /**
   * Get cart items
   */
  async getCartItems(cartId: string): Promise<CartItem[]> {
    const result = await db.query<CartItem>(
      `SELECT ci.*, 
              row_to_json(p.*) as product
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at`,
      [cartId]
    );
    
    return result.rows.map(row => ({
      ...row,
      product: row.product as any as Product,
    }));
  }
  
  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    productId: string,
    startAt: Date,
    endAt: Date
  ): Promise<CartItem> {
    const cart = await this.getCart(cartId);
    
    // Validate time range
    validateTimeRange(startAt, endAt);
    
    // Check cart item limit
    const itemCount = await db.query(
      `SELECT COUNT(*) as count FROM cart_items WHERE cart_id = $1`,
      [cartId]
    );
    
    if (Number(itemCount.rows[0].count) >= this.MAX_CART_ITEMS) {
      throw new ValidationError(`Cart cannot contain more than ${this.MAX_CART_ITEMS} items`);
    }
    
    // Get product
    const productResult = await db.query<Product>(
      `SELECT * FROM products WHERE id = $1 AND status = 'active'`,
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      throw new NotFoundError('Product', productId);
    }
    
    const product = productResult.rows[0];
    
    // Check availability
    const availability = await availabilityService.checkAvailability(
      productId,
      startAt,
      endAt,
      cartId
    );
    
    if (!availability.available) {
      throw new ValidationError('Product is not available for the selected time range');
    }
    
    // Calculate price
    const pricing = await pricingService.calculatePrice(product, startAt, endAt);
    
    // Create cart item in transaction
    return await db.transaction(async (client) => {
      // Insert cart item
      const itemResult = await client.query<CartItem>(
        `INSERT INTO cart_items (
          cart_id, product_id, start_at, end_at, price, deposit, pricing_breakdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          cartId,
          productId,
          startAt,
          endAt,
          pricing.total,
          pricing.deposit,
          JSON.stringify(pricing),
        ]
      );
      
      const cartItem = itemResult.rows[0];
      
      // Create lock
      await lockingService.createLock(
        cartId,
        cartItem.id,
        productId,
        startAt,
        endAt,
        client
      );
      
      // Extend cart expiry
      await this.extendCartExpiry(cartId, client);
      
      return cartItem;
    });
  }
  
  /**
   * Update cart item
   */
  async updateItem(
    cartId: string,
    itemId: string,
    updates: { start_at?: Date; end_at?: Date }
  ): Promise<CartItem> {
    await this.getCart(cartId);
    
    // Get existing item
    const existingResult = await db.query<CartItem>(
      `SELECT ci.*, p.* 
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.id = $1 AND ci.cart_id = $2`,
      [itemId, cartId]
    );
    
    if (existingResult.rows.length === 0) {
      throw new NotFoundError('Cart item', itemId);
    }
    
    const existing = existingResult.rows[0];
    const product = existingResult.rows[0] as any as Product;
    
    const newStartAt = updates.start_at || existing.start_at;
    const newEndAt = updates.end_at || existing.end_at;
    
    // Validate new time range
    validateTimeRange(newStartAt, newEndAt);
    
    // Check availability for new time range
    const availability = await availabilityService.checkAvailability(
      existing.product_id,
      newStartAt,
      newEndAt,
      cartId
    );
    
    if (!availability.available) {
      throw new ValidationError('Product is not available for the new time range');
    }
    
    // Recalculate price
    const pricing = await pricingService.calculatePrice(product, newStartAt, newEndAt);
    
    // Update in transaction
    return await db.transaction(async (client) => {
      // Update cart item
      const updateResult = await client.query<CartItem>(
        `UPDATE cart_items 
         SET start_at = $1, end_at = $2, price = $3, deposit = $4, pricing_breakdown = $5
         WHERE id = $6
         RETURNING *`,
        [newStartAt, newEndAt, pricing.total, pricing.deposit, JSON.stringify(pricing), itemId]
      );
      
      // Update lock
      await lockingService.updateLock(itemId, newStartAt, newEndAt, client);
      
      return updateResult.rows[0];
    });
  }
  
  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<void> {
    await this.getCart(cartId);
    
    await db.transaction(async (client) => {
      // Release locks
      await lockingService.releaseItemLocks(itemId, client);
      
      // Delete item
      const result = await client.query(
        `DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`,
        [itemId, cartId]
      );
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Cart item', itemId);
      }
    });
  }
  
  /**
   * Validate cart (check all items still available)
   */
  async validateCart(cartId: string): Promise<{
    valid: boolean;
    issues: Array<{ item_id: string; message: string }>;
  }> {
    const cart = await this.getCart(cartId);
    const items = await this.getCartItems(cartId);
    
    const issues: Array<{ item_id: string; message: string }> = [];
    
    for (const item of items) {
      const availability = await availabilityService.checkAvailability(
        item.product_id,
        item.start_at,
        item.end_at,
        cartId
      );
      
      if (!availability.available) {
        issues.push({
          item_id: item.id,
          message: `${item.product?.name} is no longer available for the selected time`,
        });
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
  
  /**
   * Lock cart for checkout
   */
  async lockCart(cartId: string): Promise<Cart> {
    const validation = await this.validateCart(cartId);
    
    if (!validation.valid) {
      throw new ValidationError('Cart contains unavailable items', validation.issues);
    }
    
    const result = await db.query<Cart>(
      `UPDATE carts 
       SET status = 'locked', locked_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [cartId]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Cart cannot be locked');
    }
    
    return result.rows[0];
  }
  
  /**
   * Mark cart as converted (after successful payment)
   */
  async convertCart(cartId: string): Promise<void> {
    await db.query(
      `UPDATE carts SET status = 'converted' WHERE id = $1`,
      [cartId]
    );
  }
  
  /**
   * Expire cart
   */
  async expireCart(cartId: string): Promise<void> {
    await db.transaction(async (client) => {
      await lockingService.releaseCartLocks(cartId, client);
      
      await client.query(
        `UPDATE carts SET status = 'expired' WHERE id = $1`,
        [cartId]
      );
    });
  }
  
  /**
   * Extend cart expiry
   */
  private async extendCartExpiry(cartId: string, client?: DbClient): Promise<void> {
    const queryFn = client ? client.query.bind(client) : db.query;
    
    const newExpiresAt = addMinutes(new Date(), this.CART_TTL_MINUTES);
    
    await queryFn(
      `UPDATE carts SET expires_at = $1 WHERE id = $2`,
      [newExpiresAt, cartId]
    );
    
    // Extend lock expiry
    await lockingService.extendLockExpiry(cartId, newExpiresAt, client);
  }
  
  /**
   * Clean up expired carts
   */
  async cleanupExpiredCarts(): Promise<number> {
    const result = await db.query(
      `SELECT id FROM carts WHERE status = 'active' AND expires_at < NOW()`
    );
    
    for (const row of result.rows) {
      await this.expireCart(row.id);
    }
    
    return result.rows.length;
  }
}

export default new CartService();
