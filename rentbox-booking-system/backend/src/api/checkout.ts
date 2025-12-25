// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  initiateCheckout,
  confirmPayment,
  handleWebhook,
} from '../services/checkout.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const checkoutSchema = z.object({
  payment_method: z.string().optional(),
  return_url: z.string().url(),
  customer_email: z.string().email().optional(),
});

const confirmPaymentSchema = z.object({
  payment_intent_id: z.string(),
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/cart/:id/checkout
 * Initiate checkout process
 */
router.post('/cart/:id/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = checkoutSchema.parse(req.body);
    const result = await initiateCheckout(req.params.id, data);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart/:id/confirm-payment
 * Confirm payment after client-side payment completion
 */
router.post('/cart/:id/confirm-payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = confirmPaymentSchema.parse(req.body);
    const result = await confirmPayment(req.params.id, data.payment_intent_id);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 * Note: This endpoint should have raw body parsing
 */
router.post('/payments/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }
    
    // req.body should be raw buffer for webhook verification
    const result = await handleWebhook(signature, req.body);
    
    res.json({
      success: true,
      handled: result.handled,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
