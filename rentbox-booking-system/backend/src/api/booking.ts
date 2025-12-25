// ═══════════════════════════════════════════════════════════════════════════
// BOOKING API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getBooking,
  getUserBookings,
  getActiveBookings,
  markPickedUp,
  markReturned,
  cancelBooking,
  extendBooking,
  confirmExtension,
} from '../services/booking.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const extendBookingSchema = z.object({
  new_end_at: z.string().datetime(),
});

const confirmExtensionSchema = z.object({
  payment_intent_id: z.string(),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await getBooking(req.params.id);
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/user/:user_id
 * Get bookings for a user
 */
router.get('/user/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const bookings = await getUserBookings(req.params.user_id, status);
    
    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/user/:user_id/active
 * Get active bookings for a user
 */
router.get('/user/:user_id/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await getActiveBookings(req.params.user_id);
    
    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/pickup
 * Mark booking as picked up
 */
router.post('/:id/pickup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await markPickedUp(req.params.id);
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/return
 * Mark booking as returned
 */
router.post('/:id/return', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await markReturned(req.params.id);
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = cancelBookingSchema.parse(req.body);
    const booking = await cancelBooking(req.params.id, data.reason);
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/extend
 * Extend a rental
 */
router.post('/:id/extend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = extendBookingSchema.parse(req.body);
    const result = await extendBooking(req.params.id, data);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/confirm-extension
 * Confirm extension payment
 */
router.post('/:id/confirm-extension', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = confirmExtensionSchema.parse(req.body);
    const result = await confirmExtension(req.params.id, data.payment_intent_id);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
