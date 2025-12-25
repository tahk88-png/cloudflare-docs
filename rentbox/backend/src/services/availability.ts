import db from '../db/connection.js';
import { AvailabilityCheck } from '../types/index.js';
import { AvailabilityError } from '../utils/errors.js';

export class AvailabilityService {
  /**
   * Check if a product is available for the given time range
   */
  async checkAvailability(
    productId: string,
    startAt: Date,
    endAt: Date,
    excludeCartId?: string
  ): Promise<AvailabilityCheck> {
    const result = await db.query(
      `SELECT * FROM check_compartment_availability($1, $2, $3, $4)`,
      [productId, startAt, endAt, excludeCartId || null]
    );
    
    const available = result.rows.length > 0;
    
    return {
      available,
      product_id: productId,
      start_at: startAt,
      end_at: endAt,
      available_compartments: result.rows.length,
      message: available 
        ? `${result.rows.length} compartment(s) available`
        : 'No compartments available for this time range',
    };
  }
  
  /**
   * Get the best available compartment for a product
   */
  async getAvailableCompartment(
    productId: string,
    startAt: Date,
    endAt: Date,
    excludeCartId?: string
  ): Promise<{ compartment_id: string; locker_id: string; compartment_number: number }> {
    const result = await db.query(
      `SELECT * FROM check_compartment_availability($1, $2, $3, $4) LIMIT 1`,
      [productId, startAt, endAt, excludeCartId || null]
    );
    
    if (result.rows.length === 0) {
      throw new AvailabilityError(
        'No compartments available for this time range',
        { product_id: productId, start_at: startAt, end_at: endAt }
      );
    }
    
    return result.rows[0];
  }
  
  /**
   * Batch check availability for multiple products
   */
  async checkBatchAvailability(
    checks: Array<{ product_id: string; start_at: Date; end_at: Date }>
  ): Promise<AvailabilityCheck[]> {
    const results = await Promise.all(
      checks.map((check) =>
        this.checkAvailability(check.product_id, check.start_at, check.end_at)
      )
    );
    
    return results;
  }
  
  /**
   * Get available time slots for a product on a specific date
   */
  async getAvailableTimeSlots(
    productId: string,
    date: Date,
    slotDurationHours: number = 1
  ): Promise<Array<{ start_at: Date; end_at: Date; available: boolean }>> {
    const slots: Array<{ start_at: Date; end_at: Date; available: boolean }> = [];
    
    // Generate 24 hour slots
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    for (let hour = 0; hour < 24; hour += slotDurationHours) {
      const slotStart = new Date(startOfDay);
      slotStart.setHours(hour);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + slotDurationHours);
      
      const check = await this.checkAvailability(productId, slotStart, slotEnd);
      
      slots.push({
        start_at: slotStart,
        end_at: slotEnd,
        available: check.available,
      });
    }
    
    return slots;
  }
  
  /**
   * Check if a compartment is available for extension
   */
  async checkExtensionAvailability(
    bookingId: string,
    newEndAt: Date
  ): Promise<{ available: boolean; message?: string; alternative_end?: Date }> {
    // Get current booking
    const bookingResult = await db.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );
    
    if (bookingResult.rows.length === 0) {
      throw new AvailabilityError('Booking not found');
    }
    
    const booking = bookingResult.rows[0];
    
    // Check if the same compartment is available
    const conflictResult = await db.query(
      `SELECT id FROM bookings 
       WHERE compartment_id = $1
         AND id != $2
         AND status IN ('confirmed', 'active', 'in_progress')
         AND (start_at, end_at) OVERLAPS ($3, $4)
       LIMIT 1`,
      [booking.compartment_id, bookingId, booking.end_at, newEndAt]
    );
    
    if (conflictResult.rows.length > 0) {
      // Find the next available time
      const nextBookingResult = await db.query(
        `SELECT start_at FROM bookings 
         WHERE compartment_id = $1
           AND id != $2
           AND status IN ('confirmed', 'active', 'in_progress')
           AND start_at > $3
         ORDER BY start_at ASC
         LIMIT 1`,
        [booking.compartment_id, bookingId, booking.end_at]
      );
      
      const alternativeEnd = nextBookingResult.rows.length > 0
        ? nextBookingResult.rows[0].start_at
        : null;
      
      return {
        available: false,
        message: 'Compartment is not available for the requested extension period',
        alternative_end: alternativeEnd,
      };
    }
    
    return {
      available: true,
      message: 'Extension is available',
    };
  }
}

export default new AvailabilityService();
