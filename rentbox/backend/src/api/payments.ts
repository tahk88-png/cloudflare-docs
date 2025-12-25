import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import paymentService from '../services/payment.js';

const router = Router();

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SIGNATURE',
        error: 'Missing Stripe signature header',
      },
    });
  }
  
  await paymentService.handleWebhook(req.body, signature);
  
  res.json({ received: true });
}));

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const payment = await paymentService.getPayment(id);
  
  res.json({
    success: true,
    data: payment,
  });
}));

export default router;
