import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import cartService from '../services/cart.js';
import paymentService from '../services/payment.js';
import { checkoutSchema } from '../utils/validators.js';

const router = Router();

/**
 * POST /api/cart/:id/checkout
 * Initiate checkout process
 */
router.post('/:id/checkout', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate request body
  const body = checkoutSchema.parse(req.body);
  
  // Validate cart
  const validation = await cartService.validateCart(id);
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        error: 'Cart contains unavailable items',
        details: validation.issues,
      },
    });
  }
  
  // Lock cart
  const cart = await cartService.lockCart(id);
  
  // Create payment intent
  const payment = await paymentService.createCheckoutIntent(
    id,
    body.return_url,
    body.cancel_url,
    body.user_email
  );
  
  res.json({
    success: true,
    data: {
      cart_id: cart.id,
      payment_id: payment.payment_id,
      client_secret: payment.client_secret,
    },
  });
}));

/**
 * POST /api/cart/:id/confirm-payment
 * Confirm payment and create bookings (called from client after successful payment)
 */
router.post('/:id/confirm-payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { payment_intent_id } = req.body;
  
  if (!payment_intent_id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        error: 'payment_intent_id is required',
      },
    });
  }
  
  // Get payment
  const payment = await paymentService.getPaymentByIntentId(payment_intent_id);
  
  if (payment.status !== 'succeeded') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PAYMENT_NOT_COMPLETED',
        error: 'Payment has not been completed',
        details: { status: payment.status },
      },
    });
  }
  
  res.json({
    success: true,
    data: {
      payment,
      message: 'Payment confirmed. Bookings have been created.',
    },
  });
}));

export default router;
