// ═══════════════════════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, queryOne, queryMany } from '../db/index.js';
import { recoverCart } from '../services/checkout.js';
import { forceRelease, getLockerTimeline, markOverdueBookings } from '../services/booking.js';
import { cleanupExpired } from '../db/index.js';
import type { Cart, Booking, Payment, CartLock } from '../types/index.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const recoverCartSchema = z.object({
  admin_id: z.string().uuid(),
});

const forceReleaseSchema = z.object({
  admin_id: z.string().uuid(),
  reason: z.string().min(1),
});

const timelineSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

// ═══════════════════════════════════════════════════════════════════════════
// CART MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/carts
 * List all carts with filters
 */
router.get('/carts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let sql = `
      SELECT c.*, 
        COUNT(ci.id) as items_count,
        SUM(ci.price + ci.deposit) as total_amount,
        p.status as payment_status,
        p.intent_id as payment_intent_id
      FROM carts c
      LEFT JOIN cart_items ci ON ci.cart_id = c.id
      LEFT JOIN payments p ON p.cart_id = c.id
    `;
    
    const params: unknown[] = [];
    
    if (status) {
      sql += ` WHERE c.status = $1`;
      params.push(status);
    }
    
    sql += `
      GROUP BY c.id, p.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const carts = await queryMany(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM carts';
    if (status) {
      countSql += ' WHERE status = $1';
    }
    const countResult = await queryOne<{ count: number }>(
      countSql,
      status ? [status] : []
    );
    
    res.json({
      success: true,
      data: {
        carts,
        pagination: {
          total: countResult?.count || 0,
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/carts/:id
 * Get detailed cart info for admin
 */
router.get('/carts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await queryOne<Cart>(`
      SELECT * FROM carts WHERE id = $1
    `, [req.params.id]);
    
    if (!cart) {
      res.status(404).json({ success: false, error: 'Cart not found' });
      return;
    }
    
    const items = await queryMany(`
      SELECT ci.*, p.name as product_name, p.category as product_category
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
    `, [req.params.id]);
    
    const locks = await queryMany<CartLock>(`
      SELECT cl.*, c.compartment_number, l.name as locker_name
      FROM cart_locks cl
      JOIN compartments c ON c.id = cl.compartment_id
      JOIN lockers l ON l.id = c.locker_id
      WHERE cl.cart_id = $1
    `, [req.params.id]);
    
    const payments = await queryMany<Payment>(`
      SELECT * FROM payments WHERE cart_id = $1 ORDER BY created_at DESC
    `, [req.params.id]);
    
    res.json({
      success: true,
      data: {
        cart,
        items,
        locks,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/carts/:id/recover
 * Manually recover a stuck cart
 */
router.post('/carts/:id/recover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = recoverCartSchema.parse(req.body);
    const result = await recoverCart(req.params.id, data.admin_id);
    
    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/bookings
 * List all bookings with filters
 */
router.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const lockerId = req.query.locker_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let sql = `
      SELECT b.*, 
        p.name as product_name,
        p.category as product_category,
        c.compartment_number,
        l.name as locker_name,
        l.location as locker_location
      FROM bookings b
      JOIN products p ON p.id = b.product_id
      JOIN compartments c ON c.id = b.compartment_id
      JOIN lockers l ON l.id = c.locker_id
      WHERE 1=1
    `;
    
    const params: unknown[] = [];
    let paramIndex = 1;
    
    if (status) {
      sql += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (lockerId) {
      sql += ` AND c.locker_id = $${paramIndex++}`;
      params.push(lockerId);
    }
    
    sql += `
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);
    
    const bookings = await queryMany(sql, params);
    
    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/bookings/:id
 * Get detailed booking info
 */
router.get('/bookings/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await queryOne<Booking>(`
      SELECT b.*, 
        p.name as product_name,
        p.category as product_category,
        c.compartment_number,
        l.name as locker_name,
        l.location as locker_location
      FROM bookings b
      JOIN products p ON p.id = b.product_id
      JOIN compartments c ON c.id = b.compartment_id
      JOIN lockers l ON l.id = c.locker_id
      WHERE b.id = $1
    `, [req.params.id]);
    
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }
    
    const payments = await queryMany<Payment>(`
      SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC
    `, [req.params.id]);
    
    const auditLog = await queryMany(`
      SELECT * FROM audit_log 
      WHERE entity_type = 'booking' AND entity_id = $1
      ORDER BY created_at DESC
    `, [req.params.id]);
    
    res.json({
      success: true,
      data: {
        booking,
        payments,
        audit_log: auditLog,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/bookings/:id/force-release
 * Force release a booking
 */
router.post('/bookings/:id/force-release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = forceReleaseSchema.parse(req.body);
    const booking = await forceRelease(req.params.id, data.admin_id, data.reason);
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOCKER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/lockers
 * List all lockers
 */
router.get('/lockers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lockers = await queryMany(`
      SELECT l.*, 
        COUNT(c.id) as compartment_count,
        COUNT(c.id) FILTER (WHERE c.is_active = true) as active_compartments
      FROM lockers l
      LEFT JOIN compartments c ON c.locker_id = l.id
      GROUP BY l.id
      ORDER BY l.name
    `);
    
    res.json({
      success: true,
      data: lockers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/lockers/:id/timeline
 * Get bookings timeline for a locker
 */
router.get('/lockers/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = timelineSchema.parse(req.query);
    
    const timeline = await getLockerTimeline(
      req.params.id,
      new Date(start_date),
      new Date(end_date)
    );
    
    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT AUDIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/payments
 * List all payments with filters
 */
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let sql = `
      SELECT p.*,
        c.status as cart_status,
        b.status as booking_status
      FROM payments p
      LEFT JOIN carts c ON c.id = p.cart_id
      LEFT JOIN bookings b ON b.id = p.booking_id
      WHERE 1=1
    `;
    
    const params: unknown[] = [];
    
    if (status) {
      sql += ` AND p.status = $1`;
      params.push(status);
    }
    
    sql += `
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const payments = await queryMany(sql, params);
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/maintenance/cleanup
 * Run cleanup tasks
 */
router.post('/maintenance/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cleanupResult = await cleanupExpired();
    const overdueCount = await markOverdueBookings();
    
    res.json({
      success: true,
      data: {
        expired_locks_removed: cleanupResult.locks,
        expired_carts_marked: cleanupResult.carts,
        overdue_bookings_marked: overdueCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      cartStats,
      bookingStats,
      paymentStats,
      activeLocksCount,
    ] = await Promise.all([
      queryOne<{ active: number; locked: number; completed: number; expired: number }>(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'locked') as locked,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'expired') as expired
        FROM carts
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      queryOne<{ confirmed: number; active: number; completed: number; overdue: number }>(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'overdue') as overdue
        FROM bookings
      `),
      queryOne<{ total_revenue: number; pending_payments: number }>(`
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) as total_revenue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_payments
        FROM payments
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM cart_locks WHERE expires_at > NOW()
      `),
    ]);
    
    res.json({
      success: true,
      data: {
        carts_24h: cartStats,
        bookings: bookingStats,
        payments_24h: paymentStats,
        active_locks: activeLocksCount?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
