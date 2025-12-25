import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import cartService from '../services/cart.js';
import pricingService from '../services/pricing.js';
import { createCartItemSchema, updateCartItemSchema } from '../utils/validators.js';

const router = Router();

/**
 * POST /api/cart
 * Create a new cart
 */
router.post('/', asyncHandler(async (req, res) => {
  const { user_id, session_id } = req.body;
  
  const cart = await cartService.createCart(user_id, session_id);
  
  res.status(201).json({
    success: true,
    data: cart,
  });
}));

/**
 * GET /api/cart/:id
 * Get cart with items and pricing summary
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cart = await cartService.getCartWithItems(id);
  
  // Calculate totals
  const totals = pricingService.calculateCartTotal(
    cart.items.map(item => ({
      price: item.price,
      deposit: item.deposit,
    }))
  );
  
  res.json({
    success: true,
    data: {
      cart,
      totals,
      items_count: cart.items.length,
      expires_in_seconds: Math.max(
        0,
        Math.floor((new Date(cart.expires_at).getTime() - Date.now()) / 1000)
      ),
    },
  });
}));

/**
 * POST /api/cart/:id/items
 * Add item to cart
 */
router.post('/:id/items', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate request body
  const body = createCartItemSchema.parse(req.body);
  
  const item = await cartService.addItem(
    id,
    body.product_id,
    new Date(body.start_at),
    new Date(body.end_at)
  );
  
  res.status(201).json({
    success: true,
    data: item,
  });
}));

/**
 * PUT /api/cart/:id/items/:item_id
 * Update cart item
 */
router.put('/:id/items/:item_id', asyncHandler(async (req, res) => {
  const { id, item_id } = req.params;
  
  // Validate request body
  const body = updateCartItemSchema.parse(req.body);
  
  const updates: any = {};
  if (body.start_at) updates.start_at = new Date(body.start_at);
  if (body.end_at) updates.end_at = new Date(body.end_at);
  
  const item = await cartService.updateItem(id, item_id, updates);
  
  res.json({
    success: true,
    data: item,
  });
}));

/**
 * DELETE /api/cart/:id/items/:item_id
 * Remove item from cart
 */
router.delete('/:id/items/:item_id', asyncHandler(async (req, res) => {
  const { id, item_id } = req.params;
  
  await cartService.removeItem(id, item_id);
  
  res.json({
    success: true,
    data: { message: 'Item removed from cart' },
  });
}));

/**
 * POST /api/cart/:id/validate
 * Validate cart availability
 */
router.post('/:id/validate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const validation = await cartService.validateCart(id);
  
  res.json({
    success: true,
    data: validation,
  });
}));

export default router;
