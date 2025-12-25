// ═══════════════════════════════════════════════════════════════════════════
// CART API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createCart,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  validateCart,
} from '../services/cart.js';
import { AppError } from '../types/index.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const createCartSchema = z.object({
  user_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
});

const addItemSchema = z.object({
  product_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
});

const updateItemSchema = z.object({
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/cart
 * Create a new cart
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCartSchema.parse(req.body);
    const cart = await createCart(data);
    
    res.status(201).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cart/:id
 * Get cart by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await getCart(req.params.id);
    
    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart/:id/items
 * Add item to cart
 */
router.post('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addItemSchema.parse(req.body);
    const cart = await addCartItem(req.params.id, data);
    
    res.status(201).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/cart/:id/items/:item_id
 * Update cart item
 */
router.put('/:id/items/:item_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateItemSchema.parse(req.body);
    const cart = await updateCartItem(req.params.id, req.params.item_id, data);
    
    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart/:id/items/:item_id
 * Remove item from cart
 */
router.delete('/:id/items/:item_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await removeCartItem(req.params.id, req.params.item_id);
    
    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart/:id/validate
 * Validate cart before checkout
 */
router.post('/:id/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await validateCart(req.params.id);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
