import db from '../db/connection.js';
import { Booking, Product, Compartment } from '../types/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateTimeRange } from '../utils/validators.js';
import availabilityService from './availability.js';
import pricingService from './pricing.js';
import { nanoid } from 'nanoid';

export class BookingService {
  /**
   * Create bookings from cart items (after payment confirmation)
   */
  async createBookingsFromCart(cartId: string, userId?: string): Promise<Booking[]> {
    return await db.transaction(async (client) => {
      // Get cart items
      const itemsResult = await client.query(
        `SELECT ci.*, cl.compartment_id
         FROM cart_items ci
         LEFT JOIN cart_locks cl ON cl.cart_item_id = ci.id
         WHERE ci.cart_id = $1`,
        [cartId]
      );
      
      if (itemsResult.rows.length === 0) {
        throw new ValidationError('Cart is empty');
      }
      
      const bookings: Booking[] = [];
      
      for (const item of itemsResult.rows) {
        // Verify compartment is still available
        let compartmentId = item.compartment_id;
        
        if (!compartmentId) {
          // If no lock exists, find available compartment
          const compartment = await availabilityService.getAvailableCompartment(
            item.product_id,
            item.start_at,
            item.end_at
          );
          compartmentId = compartment.compartment_id;
        }
        
        // Generate access codes
        const pickupCode = nanoid(8).toUpperCase();
        const returnCode = nanoid(8).toUpperCase();
        
        // Create booking
        const bookingResult = await client.query<Booking>(
          `INSERT INTO bookings (
            cart_id, product_id, compartment_id, user_id,
            start_at, end_at, status, total_price, deposit_amount,
            pricing_breakdown, pickup_code, return_code
          ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            cartId,
            item.product_id,
            compartmentId,
            userId || null,
            item.start_at,
            item.end_at,
            item.price,
            item.deposit,
            item.pricing_breakdown,
            pickupCode,
            returnCode,
          ]
        );
        
        bookings.push(bookingResult.rows[0]);
      }
      
      // Release cart locks
      await client.query(
        `DELETE FROM cart_locks WHERE cart_id = $1`,
        [cartId]
      );
      
      // Mark cart as converted
      await client.query(
        `UPDATE carts SET status = 'converted' WHERE id = $1`,
        [cartId]
      );
      
      return bookings;
    });
  }
  
  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking> {
    const result = await db.query<Booking>(
      `SELECT b.*,
              row_to_json(p.*) as product,
              row_to_json(c.*) as compartment
       FROM bookings b
       JOIN products p ON p.id = b.product_id
       JOIN compartments c ON c.id = b.compartment_id
       WHERE b.id = $1`,
      [bookingId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Booking', bookingId);
    }
    
    return {
      ...result.rows[0],
      product: result.rows[0].product as any as Product,
      compartment: result.rows[0].compartment as any as Compartment,
    };
  }
  
  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    status?: string[]
  ): Promise<Booking[]> {
    let query = `
      SELECT b.*,
             row_to_json(p.*) as product,
             row_to_json(c.*) as compartment
      FROM bookings b
      JOIN products p ON p.id = b.product_id
      JOIN compartments c ON c.id = b.compartment_id
      WHERE b.user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (status && status.length > 0) {
      query += ` AND b.status = ANY($2)`;
      params.push(status);
    }
    
    query += ` ORDER BY b.start_at DESC`;
    
    const result = await db.query<Booking>(query, params);
    
    return result.rows.map(row => ({
      ...row,
      product: row.product as any as Product,
      compartment: row.compartment as any as Compartment,
    }));
  }
  
  /**
   * Extend booking
   */
  async extendBooking(
    bookingId: string,
    newEndAt: Date
  ): Promise<{ booking: Booking; additional_payment: number }> {
    const booking = await this.getBooking(bookingId);
    
    // Validate new end date
    if (newEndAt <= booking.end_at) {
      throw new ValidationError('New end date must be after current end date');
    }
    
    validateTimeRange(booking.end_at, newEndAt);
    
    // Check if same compartment is available
    const availability = await availabilityService.checkExtensionAvailability(
      bookingId,
      newEndAt
    );
    
    if (!availability.available) {
      throw new ValidationError(
        availability.message || 'Extension not available',
        availability.alternative_end ? { alternative_end: availability.alternative_end } : undefined
      );
    }
    
    // Calculate additional price
    const extensionPricing = await pricingService.calculatePrice(
      booking.product!,
      booking.end_at,
      newEndAt
    );
    
    // Update booking in transaction
    const updatedBooking = await db.transaction(async (client) => {
      // Merge pricing breakdowns
      const originalBreakdown = booking.pricing_breakdown;
      const newBreakdown = {
        ...originalBreakdown,
        total: originalBreakdown.total + extensionPricing.total,
        hours: originalBreakdown.hours + extensionPricing.hours,
        days: originalBreakdown.days + extensionPricing.days,
        adjustments: [
          ...originalBreakdown.adjustments,
          {
            type: 'fee' as const,
            name: 'Extension',
            amount: extensionPricing.total,
            applied_to: extensionPricing.total,
          },
        ],
      };
      
      const result = await client.query<Booking>(
        `UPDATE bookings 
         SET end_at = $1,
             total_price = total_price + $2,
             pricing_breakdown = $3,
             metadata = jsonb_set(
               COALESCE(metadata, '{}'),
               '{extensions}',
               COALESCE(metadata->'extensions', '[]')::jsonb || $4::jsonb
             )
         WHERE id = $5
         RETURNING *`,
        [
          newEndAt,
          extensionPricing.total,
          JSON.stringify(newBreakdown),
          JSON.stringify([{
            extended_at: new Date().toISOString(),
            original_end: booking.end_at.toISOString(),
            new_end: newEndAt.toISOString(),
            additional_cost: extensionPricing.total,
          }]),
          bookingId,
        ]
      );
      
      return result.rows[0];
    });
    
    return {
      booking: updatedBooking,
      additional_payment: extensionPricing.total,
    };
  }
  
  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const booking = await this.getBooking(bookingId);
    
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new ValidationError('Booking cannot be cancelled');
    }
    
    const result = await db.query<Booking>(
      `UPDATE bookings 
       SET status = 'cancelled',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'),
             '{cancellation}',
             $1::jsonb
           )
       WHERE id = $2
       RETURNING *`,
      [
        JSON.stringify({
          cancelled_at: new Date().toISOString(),
          reason: reason || null,
        }),
        bookingId,
      ]
    );
    
    return result.rows[0];
  }
  
  /**
   * Complete booking (when item is returned)
   */
  async completeBooking(bookingId: string): Promise<Booking> {
    const result = await db.query<Booking>(
      `UPDATE bookings 
       SET status = 'completed',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'),
             '{completed_at}',
             to_jsonb(NOW())
           )
       WHERE id = $1 AND status IN ('confirmed', 'active', 'in_progress')
       RETURNING *`,
      [bookingId]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Booking cannot be completed');
    }
    
    return result.rows[0];
  }
  
  /**
   * Get compartment schedule
   */
  async getCompartmentSchedule(
    compartmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    const result = await db.query<Booking>(
      `SELECT b.*,
              row_to_json(p.*) as product
       FROM bookings b
       JOIN products p ON p.id = b.product_id
       WHERE b.compartment_id = $1
         AND b.status IN ('confirmed', 'active', 'in_progress')
         AND (b.start_at, b.end_at) OVERLAPS ($2, $3)
       ORDER BY b.start_at`,
      [compartmentId, startDate, endDate]
    );
    
    return result.rows.map(row => ({
      ...row,
      product: row.product as any as Product,
    }));
  }
  
  /**
   * Get all active bookings
   */
  async getActiveBookings(): Promise<Booking[]> {
    const result = await db.query<Booking>(
      `SELECT b.*,
              row_to_json(p.*) as product,
              row_to_json(c.*) as compartment
       FROM bookings b
       JOIN products p ON p.id = b.product_id
       JOIN compartments c ON c.id = b.compartment_id
       WHERE b.status IN ('confirmed', 'active', 'in_progress')
       ORDER BY b.start_at`
    );
    
    return result.rows.map(row => ({
      ...row,
      product: row.product as any as Product,
      compartment: row.compartment as any as Compartment,
    }));
  }
}

export default new BookingService();
