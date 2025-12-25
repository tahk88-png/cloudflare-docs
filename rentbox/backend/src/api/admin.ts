import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import db from '../db/connection.js';
import cartService from '../services/cart.js';
import bookingService from '../services/booking.js';
import lockingService from '../services/locking.js';

const router = Router();

/**
 * GET /api/admin/carts
 * Get all carts with status
 */
router.get('/carts', asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let query = `
    SELECT c.*,
           COUNT(ci.id) as items_count,
           EXTRACT(EPOCH FROM (c.expires_at - NOW())) as expires_in_seconds
    FROM carts c
    LEFT JOIN cart_items ci ON ci.cart_id = c.id
  `;
  
  const params: any[] = [];
  
  if (status) {
    query += ` WHERE c.status = $1`;
    params.push(status);
  }
  
  query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100`;
  
  const result = await db.query(query, params);
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /api/admin/carts/:id
 * Get cart details with items and locks
 */
router.get('/carts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cart = await cartService.getCartWithItems(id);
  const locks = await lockingService.getCartLocks(id);
  
  res.json({
    success: true,
    data: {
      cart,
      locks,
    },
  });
}));

/**
 * POST /api/admin/carts/:id/recover
 * Recover an expired/stuck cart
 */
router.post('/carts/:id/recover', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await db.transaction(async (client) => {
    // Release locks
    await lockingService.releaseCartLocks(id, client);
    
    // Update cart status
    await client.query(
      `UPDATE carts SET status = 'expired' WHERE id = $1`,
      [id]
    );
  });
  
  res.json({
    success: true,
    data: { message: 'Cart recovered successfully' },
  });
}));

/**
 * GET /api/admin/bookings
 * Get all bookings with filters
 */
router.get('/bookings', asyncHandler(async (req, res) => {
  const { status, from_date, to_date, compartment_id } = req.query;
  
  let query = `
    SELECT b.*,
           row_to_json(p.*) as product,
           row_to_json(c.*) as compartment
    FROM bookings b
    JOIN products p ON p.id = b.product_id
    JOIN compartments c ON c.id = b.compartment_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (status) {
    query += ` AND b.status = ANY($${paramIndex})`;
    params.push((status as string).split(','));
    paramIndex++;
  }
  
  if (from_date) {
    query += ` AND b.end_at >= $${paramIndex}`;
    params.push(from_date);
    paramIndex++;
  }
  
  if (to_date) {
    query += ` AND b.start_at <= $${paramIndex}`;
    params.push(to_date);
    paramIndex++;
  }
  
  if (compartment_id) {
    query += ` AND b.compartment_id = $${paramIndex}`;
    params.push(compartment_id);
    paramIndex++;
  }
  
  query += ` ORDER BY b.start_at DESC LIMIT 100`;
  
  const result = await db.query(query, params);
  
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /api/admin/bookings/timeline/:compartment_id
 * Get timeline of bookings for a compartment
 */
router.get('/bookings/timeline/:compartment_id', asyncHandler(async (req, res) => {
  const { compartment_id } = req.params;
  const { from_date, to_date } = req.query;
  
  const fromDate = from_date ? new Date(from_date as string) : new Date();
  const toDate = to_date
    ? new Date(to_date as string)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const bookings = await bookingService.getCompartmentSchedule(
    compartment_id,
    fromDate,
    toDate
  );
  
  res.json({
    success: true,
    data: bookings,
  });
}));

/**
 * POST /api/admin/bookings/:id/force-release
 * Force release a booking (emergency)
 */
router.post('/bookings/:id/force-release', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const booking = await bookingService.cancelBooking(id, reason || 'Force released by admin');
  
  res.json({
    success: true,
    data: booking,
  });
}));

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM carts WHERE status = 'active') as active_carts,
      (SELECT COUNT(*) FROM carts WHERE status = 'expired') as expired_carts,
      (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status IN ('active', 'in_progress')) as active_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
      (SELECT COUNT(*) FROM cart_locks WHERE expires_at > NOW()) as active_locks,
      (SELECT COUNT(*) FROM payments WHERE status = 'succeeded') as successful_payments,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded') as total_revenue
  `);
  
  res.json({
    success: true,
    data: stats.rows[0],
  });
}));

/**
 * POST /api/admin/cleanup
 * Manually trigger cleanup tasks
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const expiredCarts = await cartService.cleanupExpiredCarts();
  const expiredLocks = await lockingService.cleanupExpiredLocks();
  
  res.json({
    success: true,
    data: {
      expired_carts: expiredCarts,
      expired_locks: expiredLocks,
    },
  });
}));

export default router;
