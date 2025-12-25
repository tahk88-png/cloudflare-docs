import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import bookingService from '../services/booking.js';
import paymentService from '../services/payment.js';
import { extendBookingSchema } from '../utils/validators.js';

const router = Router();

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const booking = await bookingService.getBooking(id);
  
  res.json({
    success: true,
    data: booking,
  });
}));

/**
 * POST /api/bookings/:id/extend
 * Extend booking rental period
 */
router.post('/:id/extend', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate request body
  const body = extendBookingSchema.parse(req.body);
  
  // Calculate extension and check availability
  const result = await bookingService.extendBooking(
    id,
    new Date(body.new_end_at)
  );
  
  // If payment required, create payment intent
  if (result.additional_payment > 0) {
    const payment = await paymentService.createExtensionIntent(
      id,
      result.additional_payment,
      req.body.user_email
    );
    
    return res.json({
      success: true,
      data: {
        booking: result.booking,
        additional_payment: result.additional_payment,
        payment_required: true,
        client_secret: payment.client_secret,
        payment_id: payment.payment_id,
      },
    });
  }
  
  res.json({
    success: true,
    data: {
      booking: result.booking,
      additional_payment: 0,
      payment_required: false,
    },
  });
}));

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const booking = await bookingService.cancelBooking(id, reason);
  
  res.json({
    success: true,
    data: booking,
  });
}));

/**
 * POST /api/bookings/:id/complete
 * Mark booking as completed
 */
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const booking = await bookingService.completeBooking(id);
  
  res.json({
    success: true,
    data: booking,
  });
}));

/**
 * GET /api/bookings/user/:user_id
 * Get user's bookings
 */
router.get('/user/:user_id', asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { status } = req.query;
  
  const statusFilter = status
    ? (status as string).split(',')
    : undefined;
  
  const bookings = await bookingService.getUserBookings(user_id, statusFilter);
  
  res.json({
    success: true,
    data: bookings,
  });
}));

export default router;
