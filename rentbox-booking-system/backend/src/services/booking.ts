// ═══════════════════════════════════════════════════════════════════════════
// BOOKING SERVICE
// Handles booking management and rental extensions
// ═══════════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { query, queryOne, queryMany, withTransaction, txQueryOne } from '../db/index.js';
import { calculateExtensionPrice } from './pricing-engine.js';
import { checkExtensionAvailability } from './availability.js';
import type {
  Booking,
  Product,
  Compartment,
  Locker,
  Payment,
  BookingResponse,
  ExtendBookingRequest,
  ExtendBookingResponse,
} from '../types/index.js';
import { NotFoundError, ValidationError, AvailabilityError } from '../types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
});

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get booking by ID with full details
 */
export async function getBooking(bookingId: string): Promise<BookingResponse> {
  const booking = await queryOne<Booking>(`
    SELECT * FROM bookings WHERE id = $1
  `, [bookingId]);
  
  if (!booking) {
    throw new NotFoundError('Booking', bookingId);
  }
  
  return formatBookingResponse(booking);
}

/**
 * Get bookings for a user
 */
export async function getUserBookings(
  userId: string,
  status?: string
): Promise<BookingResponse[]> {
  let sql = `SELECT * FROM bookings WHERE user_id = $1`;
  const params: unknown[] = [userId];
  
  if (status) {
    sql += ` AND status = $2`;
    params.push(status);
  }
  
  sql += ` ORDER BY start_at DESC`;
  
  const bookings = await queryMany<Booking>(sql, params);
  return Promise.all(bookings.map(formatBookingResponse));
}

/**
 * Get active bookings (for pickup/active status)
 */
export async function getActiveBookings(userId: string): Promise<BookingResponse[]> {
  const bookings = await queryMany<Booking>(`
    SELECT * FROM bookings
    WHERE user_id = $1
    AND status IN ('confirmed', 'active', 'extended')
    ORDER BY start_at ASC
  `, [userId]);
  
  return Promise.all(bookings.map(formatBookingResponse));
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mark booking as picked up (tool taken from locker)
 */
export async function markPickedUp(bookingId: string): Promise<BookingResponse> {
  const booking = await queryOne<Booking>(`
    UPDATE bookings
    SET status = 'active', picked_up_at = NOW()
    WHERE id = $1 AND status = 'confirmed'
    RETURNING *
  `, [bookingId]);
  
  if (!booking) {
    throw new ValidationError('Booking cannot be picked up (invalid status or not found)');
  }
  
  // Log audit
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
    VALUES ('pickup', 'booking', $1, $2, $3)
  `, [bookingId, booking.user_id, JSON.stringify({ picked_up_at: new Date() })]);
  
  return formatBookingResponse(booking);
}

/**
 * Mark booking as returned (tool returned to locker)
 */
export async function markReturned(bookingId: string): Promise<BookingResponse> {
  const booking = await queryOne<Booking>(`
    UPDATE bookings
    SET status = 'completed', returned_at = NOW()
    WHERE id = $1 AND status IN ('active', 'extended', 'overdue')
    RETURNING *
  `, [bookingId]);
  
  if (!booking) {
    throw new ValidationError('Booking cannot be returned (invalid status or not found)');
  }
  
  // Check if returned late
  const wasOverdue = new Date(booking.end_at) < new Date(booking.returned_at!);
  
  // Log audit
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
    VALUES ('return', 'booking', $1, $2, $3)
  `, [
    bookingId,
    booking.user_id,
    JSON.stringify({
      returned_at: booking.returned_at,
      was_overdue: wasOverdue,
    }),
  ]);
  
  return formatBookingResponse(booking);
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<BookingResponse> {
  const booking = await queryOne<Booking>(`
    UPDATE bookings
    SET status = 'cancelled'
    WHERE id = $1 AND status = 'confirmed'
    RETURNING *
  `, [bookingId]);
  
  if (!booking) {
    throw new ValidationError('Booking cannot be cancelled (already picked up or invalid status)');
  }
  
  // Log audit
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
    VALUES ('cancel', 'booking', $1, $2, $3)
  `, [bookingId, booking.user_id, JSON.stringify({ reason })]);
  
  // TODO: Initiate refund through Stripe
  
  return formatBookingResponse(booking);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENTAL EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extend a rental booking
 */
export async function extendBooking(
  bookingId: string,
  data: ExtendBookingRequest
): Promise<ExtendBookingResponse> {
  const booking = await queryOne<Booking>(`
    SELECT * FROM bookings WHERE id = $1
  `, [bookingId]);
  
  if (!booking) {
    throw new NotFoundError('Booking', bookingId);
  }
  
  // Validate booking status
  if (!['active', 'extended', 'confirmed'].includes(booking.status)) {
    return {
      success: false,
      error: `Cannot extend a ${booking.status} booking`,
    };
  }
  
  const currentEndAt = new Date(booking.end_at);
  const newEndAt = new Date(data.new_end_at);
  
  // Validate new end time
  if (newEndAt <= currentEndAt) {
    return {
      success: false,
      error: 'New end time must be after current end time',
    };
  }
  
  // Check availability for extension
  const availability = await checkExtensionAvailability(
    bookingId,
    booking.compartment_id,
    currentEndAt,
    newEndAt
  );
  
  if (!availability.available) {
    return {
      success: false,
      error: availability.reason,
      alternative_suggestion: availability.maxExtensionTime
        ? {
            available_until: availability.maxExtensionTime.toISOString(),
            reason: availability.reason || 'Compartment is reserved',
          }
        : undefined,
    };
  }
  
  // Get product for pricing
  const product = await queryOne<Product>(`
    SELECT * FROM products WHERE id = $1
  `, [booking.product_id]);
  
  if (!product) {
    throw new NotFoundError('Product', booking.product_id);
  }
  
  // Calculate extension cost
  const extensionPrice = await calculateExtensionPrice(product, currentEndAt, newEndAt);
  
  // If there's a cost, create payment intent
  if (extensionPrice.total > 0) {
    const idempotencyKey = `extension_${bookingId}_${Date.now()}`;
    const totalCents = Math.round(extensionPrice.total * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      description: `Rental extension: ${product.name}`,
      metadata: {
        booking_id: bookingId,
        type: 'extension',
        new_end_at: newEndAt.toISOString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey,
    });
    
    // Store pending payment
    await query(`
      INSERT INTO payments (
        booking_id, provider, intent_id, type, amount, currency,
        status, idempotency_key
      )
      VALUES ($1, 'stripe', $2, 'extension', $3, 'EUR', 'pending', $4)
    `, [bookingId, paymentIntent.id, extensionPrice.total, idempotencyKey]);
    
    return {
      success: true,
      payment_required: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
      additional_cost: extensionPrice.total,
    };
  }
  
  // No additional cost - extend immediately
  const extendedBooking = await applyExtension(bookingId, newEndAt);
  
  return {
    success: true,
    payment_required: false,
    booking: await formatBookingResponse(extendedBooking),
  };
}

/**
 * Confirm extension payment and apply extension
 */
export async function confirmExtension(
  bookingId: string,
  paymentIntentId: string
): Promise<ExtendBookingResponse> {
  // Verify payment
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (paymentIntent.status !== 'succeeded') {
    return {
      success: false,
      error: `Payment not successful. Status: ${paymentIntent.status}`,
    };
  }
  
  const newEndAt = paymentIntent.metadata.new_end_at;
  if (!newEndAt) {
    return {
      success: false,
      error: 'Invalid payment metadata',
    };
  }
  
  // Update payment status
  await query(`
    UPDATE payments SET status = 'succeeded', paid_at = NOW()
    WHERE intent_id = $1
  `, [paymentIntentId]);
  
  // Apply extension
  const booking = await applyExtension(bookingId, new Date(newEndAt));
  
  return {
    success: true,
    booking: await formatBookingResponse(booking),
  };
}

/**
 * Apply extension to booking (after payment or when free)
 */
async function applyExtension(bookingId: string, newEndAt: Date): Promise<Booking> {
  return withTransaction(async (client) => {
    const booking = await txQueryOne<Booking>(client, `
      UPDATE bookings
      SET 
        end_at = $2,
        original_end_at = COALESCE(original_end_at, end_at),
        status = 'extended',
        extension_count = extension_count + 1
      WHERE id = $1
      RETURNING *
    `, [bookingId, newEndAt.toISOString()]);
    
    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }
    
    // Log audit
    await client.query(`
      INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
      VALUES ('extend', 'booking', $1, $2, $3)
    `, [
      bookingId,
      booking.user_id,
      JSON.stringify({
        previous_end_at: booking.original_end_at,
        new_end_at: newEndAt,
        extension_count: booking.extension_count,
      }),
    ]);
    
    return booking;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERDUE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mark overdue bookings
 * Should be run periodically (e.g., every hour)
 */
export async function markOverdueBookings(): Promise<number> {
  const result = await query(`
    UPDATE bookings
    SET status = 'overdue'
    WHERE status IN ('active', 'extended')
    AND end_at < NOW()
    AND returned_at IS NULL
  `);
  
  return result.rowCount || 0;
}

/**
 * Get overdue bookings for notifications
 */
export async function getOverdueBookings(): Promise<BookingResponse[]> {
  const bookings = await queryMany<Booking>(`
    SELECT * FROM bookings
    WHERE status = 'overdue'
    ORDER BY end_at ASC
  `);
  
  return Promise.all(bookings.map(formatBookingResponse));
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Force release a booking (admin only)
 */
export async function forceRelease(
  bookingId: string,
  adminId: string,
  reason: string
): Promise<BookingResponse> {
  const booking = await queryOne<Booking>(`
    UPDATE bookings
    SET status = 'completed', returned_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [bookingId]);
  
  if (!booking) {
    throw new NotFoundError('Booking', bookingId);
  }
  
  // Log audit
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, admin_id, details)
    VALUES ('force_release', 'booking', $1, $2, $3)
  `, [bookingId, adminId, JSON.stringify({ reason })]);
  
  return formatBookingResponse(booking);
}

/**
 * Get bookings timeline for a locker (admin view)
 */
export async function getLockerTimeline(
  lockerId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  compartment_id: string;
  compartment_number: string;
  bookings: {
    id: string;
    product_name: string;
    start_at: string;
    end_at: string;
    status: string;
  }[];
}[]> {
  const compartments = await queryMany<Compartment & { product_name: string }>(`
    SELECT c.*, p.name as product_name
    FROM compartments c
    LEFT JOIN products p ON p.id = c.product_id
    WHERE c.locker_id = $1 AND c.is_active = true
    ORDER BY c.compartment_number
  `, [lockerId]);
  
  const timeline = [];
  
  for (const compartment of compartments) {
    const bookings = await queryMany<Booking & { product_name: string }>(`
      SELECT b.*, p.name as product_name
      FROM bookings b
      JOIN products p ON p.id = b.product_id
      WHERE b.compartment_id = $1
      AND b.status IN ('confirmed', 'active', 'extended', 'completed')
      AND (
        (b.start_at >= $2 AND b.start_at < $3)
        OR (b.end_at > $2 AND b.end_at <= $3)
        OR (b.start_at <= $2 AND b.end_at >= $3)
      )
      ORDER BY b.start_at
    `, [compartment.id, startDate.toISOString(), endDate.toISOString()]);
    
    timeline.push({
      compartment_id: compartment.id,
      compartment_number: compartment.compartment_number,
      bookings: bookings.map(b => ({
        id: b.id,
        product_name: b.product_name,
        start_at: b.start_at.toISOString(),
        end_at: b.end_at.toISOString(),
        status: b.status,
      })),
    });
  }
  
  return timeline;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function formatBookingResponse(booking: Booking): Promise<BookingResponse> {
  const product = await queryOne<Product>(`
    SELECT * FROM products WHERE id = $1
  `, [booking.product_id]);
  
  const compartment = await queryOne<Compartment & {
    locker_name: string;
    locker_location: string;
  }>(`
    SELECT c.*, l.name as locker_name, l.location as locker_location
    FROM compartments c
    JOIN lockers l ON l.id = c.locker_id
    WHERE c.id = $1
  `, [booking.compartment_id]);
  
  return {
    id: booking.id,
    product: {
      id: product!.id,
      name: product!.name,
      category: product!.category,
      image_url: product!.image_url,
    },
    compartment: {
      id: compartment!.id,
      locker_name: compartment!.locker_name,
      locker_location: compartment!.locker_location,
      compartment_number: compartment!.compartment_number,
    },
    start_at: booking.start_at.toISOString(),
    end_at: booking.end_at.toISOString(),
    status: booking.status,
    total_price: Number(booking.total_price),
    deposit_amount: Number(booking.deposit_amount),
    pickup_code: booking.pickup_code || '',
    pickup_instructions: generatePickupInstructions(compartment!),
    created_at: booking.created_at.toISOString(),
  };
}

function generatePickupInstructions(
  compartment: Compartment & { locker_name: string; locker_location: string }
): string {
  return `
Visit ${compartment.locker_name} at ${compartment.locker_location}.
Go to compartment ${compartment.compartment_number}.
Enter your pickup code on the keypad to unlock.
Take the tool and close the door securely.
`.trim();
}
