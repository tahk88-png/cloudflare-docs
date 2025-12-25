// ═══════════════════════════════════════════════════════════════════════════
// CART SERVICE
// Handles cart CRUD operations and validation
// ═══════════════════════════════════════════════════════════════════════════

import { addMinutes, differenceInSeconds } from 'date-fns';
import { query, queryOne, queryMany, withTransaction, txQueryOne, txQueryMany } from '../db/index.js';
import { calculatePrice } from './pricing-engine.js';
import { 
  checkProductAvailability, 
  createLockTx, 
  releaseLock,
  releaseCartLocks,
  getCartLocks,
  verifyCartLocks 
} from './availability.js';
import type {
  Cart,
  CartItem,
  Product,
  CartResponse,
  CartItemResponse,
  CartSummary,
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
  CreateCartRequest,
  AddCartItemRequest,
  UpdateCartItemRequest,
} from '../types/index.js';
import { NotFoundError, ValidationError, AvailabilityError } from '../types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CART_TTL_MINUTES = 15; // Cart expires after 15 minutes of inactivity
const CART_MAX_ITEMS = 10;   // Maximum items per cart

// ═══════════════════════════════════════════════════════════════════════════
// CART CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new cart
 */
export async function createCart(data: CreateCartRequest): Promise<CartResponse> {
  const expiresAt = addMinutes(new Date(), CART_TTL_MINUTES);
  
  const cart = await queryOne<Cart>(`
    INSERT INTO carts (user_id, session_id, expires_at, status)
    VALUES ($1, $2, $3, 'active')
    RETURNING *
  `, [data.user_id || null, data.session_id || null, expiresAt.toISOString()]);
  
  if (!cart) {
    throw new Error('Failed to create cart');
  }
  
  return formatCartResponse(cart, []);
}

/**
 * Get cart by ID with all items
 */
export async function getCart(cartId: string): Promise<CartResponse> {
  const cart = await queryOne<Cart>(`
    SELECT * FROM carts WHERE id = $1
  `, [cartId]);
  
  if (!cart) {
    throw new NotFoundError('Cart', cartId);
  }
  
  // Check if cart has expired
  if (cart.status === 'active' && new Date(cart.expires_at) < new Date()) {
    await query(`UPDATE carts SET status = 'expired' WHERE id = $1`, [cartId]);
    cart.status = 'expired';
  }
  
  const items = await getCartItems(cartId);
  return formatCartResponse(cart, items);
}

/**
 * Get cart items with product details
 */
async function getCartItems(cartId: string): Promise<CartItemWithProduct[]> {
  return queryMany<CartItemWithProduct>(`
    SELECT 
      ci.*,
      p.name as product_name,
      p.category as product_category,
      p.image_url as product_image_url,
      cl.id as lock_id,
      cl.compartment_id as locked_compartment_id,
      cl.expires_at as lock_expires_at
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN cart_locks cl ON cl.cart_item_id = ci.id AND cl.expires_at > NOW()
    WHERE ci.cart_id = $1
  `, [cartId]);
}

interface CartItemWithProduct extends CartItem {
  product_name: string;
  product_category: string | null;
  product_image_url: string | null;
  lock_id: string | null;
  locked_compartment_id: string | null;
  lock_expires_at: Date | null;
}

/**
 * Add item to cart
 */
export async function addCartItem(
  cartId: string,
  data: AddCartItemRequest
): Promise<CartResponse> {
  return withTransaction(async (client) => {
    // Get and validate cart
    const cart = await txQueryOne<Cart>(client, `
      SELECT * FROM carts WHERE id = $1 FOR UPDATE
    `, [cartId]);
    
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    
    if (cart.status !== 'active') {
      throw new ValidationError(`Cart is ${cart.status} and cannot be modified`);
    }
    
    if (new Date(cart.expires_at) < new Date()) {
      throw new ValidationError('Cart has expired');
    }
    
    // Check item limit
    const itemCount = await txQueryOne<{ count: number }>(client, `
      SELECT COUNT(*) as count FROM cart_items WHERE cart_id = $1
    `, [cartId]);
    
    if (itemCount && itemCount.count >= CART_MAX_ITEMS) {
      throw new ValidationError(`Maximum ${CART_MAX_ITEMS} items allowed per cart`);
    }
    
    // Check if product already in cart
    const existingItem = await txQueryOne<CartItem>(client, `
      SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2
    `, [cartId, data.product_id]);
    
    if (existingItem) {
      throw new ValidationError('Product already in cart. Update the existing item instead.');
    }
    
    // Get product
    const product = await txQueryOne<Product>(client, `
      SELECT * FROM products WHERE id = $1 AND is_active = true
    `, [data.product_id]);
    
    if (!product) {
      throw new NotFoundError('Product', data.product_id);
    }
    
    // Parse dates
    const startAt = new Date(data.start_at);
    const endAt = new Date(data.end_at);
    
    // Validate time range
    if (endAt <= startAt) {
      throw new ValidationError('End time must be after start time');
    }
    
    if (startAt < new Date()) {
      throw new ValidationError('Start time cannot be in the past');
    }
    
    // Check availability
    const availability = await checkProductAvailability(
      data.product_id,
      startAt,
      endAt,
      cartId
    );
    
    if (!availability.available) {
      throw new AvailabilityError(
        availability.reason || 'Product not available',
        { alternatives: availability.alternatives }
      );
    }
    
    // Calculate price
    const priceBreakdown = await calculatePrice(product, startAt, endAt);
    
    // Create cart item
    const cartItem = await txQueryOne<CartItem>(client, `
      INSERT INTO cart_items (
        cart_id, product_id, start_at, end_at,
        price, deposit, price_breakdown
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      cartId,
      data.product_id,
      startAt.toISOString(),
      endAt.toISOString(),
      priceBreakdown.subtotal,
      priceBreakdown.deposit,
      JSON.stringify(priceBreakdown),
    ]);
    
    if (!cartItem) {
      throw new Error('Failed to create cart item');
    }
    
    // Create soft lock
    await createLockTx(
      client,
      cartId,
      cartItem.id,
      data.product_id,
      availability.compartment_id!,
      startAt,
      endAt,
      cart.expires_at
    );
    
    // Extend cart expiry
    const newExpiresAt = addMinutes(new Date(), CART_TTL_MINUTES);
    await client.query(`
      UPDATE carts SET expires_at = $2 WHERE id = $1
    `, [cartId, newExpiresAt.toISOString()]);
    
    // Extend all locks
    await client.query(`
      UPDATE cart_locks SET expires_at = $2 WHERE cart_id = $1
    `, [cartId, newExpiresAt.toISOString()]);
    
    // Get updated cart
    const updatedCart = await txQueryOne<Cart>(client, `
      SELECT * FROM carts WHERE id = $1
    `, [cartId]);
    
    const items = await txQueryMany<CartItemWithProduct>(client, `
      SELECT 
        ci.*,
        p.name as product_name,
        p.category as product_category,
        p.image_url as product_image_url,
        cl.id as lock_id,
        cl.compartment_id as locked_compartment_id,
        cl.expires_at as lock_expires_at
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN cart_locks cl ON cl.cart_item_id = ci.id AND cl.expires_at > NOW()
      WHERE ci.cart_id = $1
    `, [cartId]);
    
    return formatCartResponse(updatedCart!, items);
  });
}

/**
 * Update cart item (time range)
 */
export async function updateCartItem(
  cartId: string,
  itemId: string,
  data: UpdateCartItemRequest
): Promise<CartResponse> {
  return withTransaction(async (client) => {
    // Get and validate cart
    const cart = await txQueryOne<Cart>(client, `
      SELECT * FROM carts WHERE id = $1 FOR UPDATE
    `, [cartId]);
    
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    
    if (cart.status !== 'active') {
      throw new ValidationError(`Cart is ${cart.status} and cannot be modified`);
    }
    
    // Get cart item
    const cartItem = await txQueryOne<CartItem>(client, `
      SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2 FOR UPDATE
    `, [itemId, cartId]);
    
    if (!cartItem) {
      throw new NotFoundError('Cart item', itemId);
    }
    
    // Get product
    const product = await txQueryOne<Product>(client, `
      SELECT * FROM products WHERE id = $1
    `, [cartItem.product_id]);
    
    if (!product) {
      throw new NotFoundError('Product', cartItem.product_id);
    }
    
    // Parse dates
    const startAt = data.start_at ? new Date(data.start_at) : cartItem.start_at;
    const endAt = data.end_at ? new Date(data.end_at) : cartItem.end_at;
    
    // Validate time range
    if (endAt <= startAt) {
      throw new ValidationError('End time must be after start time');
    }
    
    if (startAt < new Date()) {
      throw new ValidationError('Start time cannot be in the past');
    }
    
    // Release existing lock
    await client.query(
      'DELETE FROM cart_locks WHERE cart_item_id = $1',
      [itemId]
    );
    
    // Check availability for new time range
    const availability = await checkProductAvailability(
      cartItem.product_id,
      startAt,
      endAt,
      cartId
    );
    
    if (!availability.available) {
      throw new AvailabilityError(
        availability.reason || 'Product not available for new time range',
        { alternatives: availability.alternatives }
      );
    }
    
    // Recalculate price
    const priceBreakdown = await calculatePrice(product, startAt, endAt);
    
    // Update cart item
    await client.query(`
      UPDATE cart_items
      SET start_at = $3, end_at = $4, price = $5, deposit = $6, price_breakdown = $7, updated_at = NOW()
      WHERE id = $1 AND cart_id = $2
    `, [
      itemId,
      cartId,
      startAt.toISOString(),
      endAt.toISOString(),
      priceBreakdown.subtotal,
      priceBreakdown.deposit,
      JSON.stringify(priceBreakdown),
    ]);
    
    // Create new lock
    await createLockTx(
      client,
      cartId,
      itemId,
      cartItem.product_id,
      availability.compartment_id!,
      startAt,
      endAt,
      cart.expires_at
    );
    
    // Extend cart expiry
    const newExpiresAt = addMinutes(new Date(), CART_TTL_MINUTES);
    await client.query(`
      UPDATE carts SET expires_at = $2 WHERE id = $1
    `, [cartId, newExpiresAt.toISOString()]);
    
    // Extend all locks
    await client.query(`
      UPDATE cart_locks SET expires_at = $2 WHERE cart_id = $1
    `, [cartId, newExpiresAt.toISOString()]);
    
    // Get updated cart
    const updatedCart = await txQueryOne<Cart>(client, `
      SELECT * FROM carts WHERE id = $1
    `, [cartId]);
    
    const items = await txQueryMany<CartItemWithProduct>(client, `
      SELECT 
        ci.*,
        p.name as product_name,
        p.category as product_category,
        p.image_url as product_image_url,
        cl.id as lock_id,
        cl.compartment_id as locked_compartment_id,
        cl.expires_at as lock_expires_at
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN cart_locks cl ON cl.cart_item_id = ci.id AND cl.expires_at > NOW()
      WHERE ci.cart_id = $1
    `, [cartId]);
    
    return formatCartResponse(updatedCart!, items);
  });
}

/**
 * Remove item from cart
 */
export async function removeCartItem(
  cartId: string,
  itemId: string
): Promise<CartResponse> {
  // Release lock first
  await releaseLock(itemId);
  
  // Delete cart item
  const result = await query(`
    DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id
  `, [itemId, cartId]);
  
  if (result.rowCount === 0) {
    throw new NotFoundError('Cart item', itemId);
  }
  
  return getCart(cartId);
}

// ═══════════════════════════════════════════════════════════════════════════
// CART VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate cart before checkout
 * Checks availability, recalculates prices, and returns validation result
 */
export async function validateCart(cartId: string): Promise<ValidationResult> {
  const cart = await queryOne<Cart>(`SELECT * FROM carts WHERE id = $1`, [cartId]);
  
  if (!cart) {
    return {
      valid: false,
      errors: [{ code: 'CART_NOT_FOUND', message: 'Cart not found' }],
      warnings: [],
    };
  }
  
  if (cart.status !== 'active') {
    return {
      valid: false,
      errors: [{ code: 'CART_NOT_ACTIVE', message: `Cart is ${cart.status}` }],
      warnings: [],
    };
  }
  
  if (new Date(cart.expires_at) < new Date()) {
    return {
      valid: false,
      errors: [{ code: 'CART_EXPIRED', message: 'Cart has expired' }],
      warnings: [],
    };
  }
  
  const items = await getCartItems(cartId);
  
  if (items.length === 0) {
    return {
      valid: false,
      errors: [{ code: 'CART_EMPTY', message: 'Cart is empty' }],
      warnings: [],
    };
  }
  
  const errors: ValidationErrorType[] = [];
  const warnings: ValidationWarning[] = [];
  const recalculatedItems: CartItemResponse[] = [];
  
  for (const item of items) {
    // Check if lock is still valid
    if (!item.lock_id) {
      // Try to re-acquire lock
      const availability = await checkProductAvailability(
        item.product_id,
        new Date(item.start_at),
        new Date(item.end_at),
        cartId
      );
      
      if (!availability.available) {
        errors.push({
          item_id: item.id,
          code: 'ITEM_UNAVAILABLE',
          message: `${item.product_name} is no longer available for the selected time`,
        });
        continue;
      }
    }
    
    // Check if start time is still in future
    if (new Date(item.start_at) < new Date()) {
      errors.push({
        item_id: item.id,
        code: 'START_TIME_PASSED',
        message: `Start time for ${item.product_name} has passed`,
      });
      continue;
    }
    
    // Recalculate price
    const product = await queryOne<Product>(`
      SELECT * FROM products WHERE id = $1
    `, [item.product_id]);
    
    if (!product) {
      errors.push({
        item_id: item.id,
        code: 'PRODUCT_NOT_FOUND',
        message: `Product ${item.product_name} no longer exists`,
      });
      continue;
    }
    
    const newPriceBreakdown = await calculatePrice(
      product,
      new Date(item.start_at),
      new Date(item.end_at)
    );
    
    // Check for price changes
    if (Math.abs(newPriceBreakdown.total - (item.price + item.deposit)) > 0.01) {
      warnings.push({
        item_id: item.id,
        code: 'PRICE_CHANGED',
        message: `Price for ${item.product_name} has changed`,
      });
      
      // Update price in database
      await query(`
        UPDATE cart_items
        SET price = $3, deposit = $4, price_breakdown = $5, updated_at = NOW()
        WHERE id = $1 AND cart_id = $2
      `, [
        item.id,
        cartId,
        newPriceBreakdown.subtotal,
        newPriceBreakdown.deposit,
        JSON.stringify(newPriceBreakdown),
      ]);
    }
    
    recalculatedItems.push(formatCartItemResponse(item, newPriceBreakdown));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recalculated_items: recalculatedItems,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CART STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lock cart for checkout
 */
export async function lockCartForCheckout(cartId: string): Promise<void> {
  const result = await query(`
    UPDATE carts
    SET status = 'locked', checkout_started_at = NOW()
    WHERE id = $1 AND status = 'active'
  `, [cartId]);
  
  if (result.rowCount === 0) {
    throw new ValidationError('Cart cannot be locked for checkout');
  }
}

/**
 * Unlock cart (if payment fails)
 */
export async function unlockCart(cartId: string): Promise<void> {
  await query(`
    UPDATE carts
    SET status = 'active', checkout_started_at = NULL
    WHERE id = $1 AND status = 'locked'
  `, [cartId]);
}

/**
 * Mark cart as completed
 */
export async function completeCart(cartId: string): Promise<void> {
  await query(`
    UPDATE carts SET status = 'completed' WHERE id = $1
  `, [cartId]);
}

/**
 * Abandon cart
 */
export async function abandonCart(cartId: string): Promise<void> {
  await releaseCartLocks(cartId);
  await query(`
    UPDATE carts SET status = 'abandoned' WHERE id = $1
  `, [cartId]);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

function formatCartResponse(cart: Cart, items: CartItemWithProduct[]): CartResponse {
  const now = new Date();
  const expiresAt = new Date(cart.expires_at);
  const expiresInSeconds = Math.max(0, differenceInSeconds(expiresAt, now));
  
  const formattedItems = items.map(item => {
    const priceBreakdown = typeof item.price_breakdown === 'string'
      ? JSON.parse(item.price_breakdown)
      : item.price_breakdown;
    return formatCartItemResponse(item, priceBreakdown);
  });
  
  const summary = calculateCartSummary(formattedItems);
  
  return {
    id: cart.id,
    status: cart.status,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: expiresInSeconds,
    items: formattedItems,
    summary,
    created_at: cart.created_at.toISOString(),
  };
}

function formatCartItemResponse(
  item: CartItemWithProduct,
  priceBreakdown: any
): CartItemResponse {
  const startAt = new Date(item.start_at);
  const endAt = new Date(item.end_at);
  const durationHours = Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60));
  
  let lockStatus: 'locked' | 'available' | 'unavailable' = 'unavailable';
  if (item.lock_id && item.lock_expires_at && new Date(item.lock_expires_at) > new Date()) {
    lockStatus = 'locked';
  } else if (!item.lock_id) {
    lockStatus = 'available';
  }
  
  return {
    id: item.id,
    product: {
      id: item.product_id,
      name: item.product_name,
      category: item.product_category,
      image_url: item.product_image_url,
    },
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    duration_hours: durationHours,
    price: item.price,
    deposit: item.deposit,
    price_breakdown: priceBreakdown,
    lock_status: lockStatus,
  };
}

function calculateCartSummary(items: CartItemResponse[]): CartSummary {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const totalDeposit = items.reduce((sum, item) => sum + item.deposit, 0);
  
  return {
    items_count: items.length,
    subtotal: Math.round(subtotal * 100) / 100,
    total_deposit: Math.round(totalDeposit * 100) / 100,
    total: Math.round((subtotal + totalDeposit) * 100) / 100,
    currency: 'EUR',
  };
}

export { CART_TTL_MINUTES, CART_MAX_ITEMS };
