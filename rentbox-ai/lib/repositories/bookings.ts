import { query } from '../db';
import { Booking, BookingWithDetails } from '../types';

export class BookingRepository {
  static async findById(id: number): Promise<BookingWithDetails | null> {
    const result = await query<BookingWithDetails>(
      `SELECT 
        b.*,
        row_to_json(u.*) as user,
        row_to_json(p.*) as product,
        row_to_json(c.*) as compartment,
        row_to_json(l.*) as locker
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN products p ON b.product_id = p.id
      LEFT JOIN compartments c ON b.compartment_id = c.id
      LEFT JOIN lockers l ON c.locker_id = l.id
      WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const booking = result.rows[0];
    
    // Nest compartment inside locker if both exist
    if (booking.compartment && booking.locker) {
      booking.compartment = {
        ...booking.compartment,
        locker: booking.locker
      };
      delete booking.locker;
    }

    return booking;
  }

  static async findByUserId(userId: number): Promise<Booking[]> {
    const result = await query<Booking>(
      `SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findOverdue(): Promise<BookingWithDetails[]> {
    const result = await query<BookingWithDetails>(
      `SELECT 
        b.*,
        row_to_json(u.*) as user,
        row_to_json(p.*) as product,
        row_to_json(c.*) as compartment,
        row_to_json(l.*) as locker
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN products p ON b.product_id = p.id
      LEFT JOIN compartments c ON b.compartment_id = c.id
      LEFT JOIN lockers l ON c.locker_id = l.id
      WHERE b.status = 'overdue' OR (b.end_time < NOW() AND b.status NOT IN ('completed', 'cancelled'))
      ORDER BY b.end_time ASC`
    );

    return result.rows.map(booking => {
      if (booking.compartment && booking.locker) {
        booking.compartment = {
          ...booking.compartment,
          locker: booking.locker
        };
        delete booking.locker;
      }
      return booking;
    });
  }

  static async findPendingPickup(): Promise<BookingWithDetails[]> {
    const result = await query<BookingWithDetails>(
      `SELECT 
        b.*,
        row_to_json(u.*) as user,
        row_to_json(p.*) as product
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN products p ON b.product_id = p.id
      WHERE b.status = 'confirmed' 
        AND b.start_time <= NOW() + INTERVAL '2 hours'
        AND b.start_time > NOW()
      ORDER BY b.start_time ASC`
    );

    return result.rows;
  }

  static async updateStatus(id: number, status: Booking['status']): Promise<void> {
    await query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
  }

  static async markAsOverdue(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    
    await query(
      `UPDATE bookings 
       SET status = 'overdue', updated_at = NOW() 
       WHERE id = ANY($1::int[])`,
      [ids]
    );
  }

  static async getPayments(bookingId: number) {
    const result = await query(
      `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return result.rows;
  }

  static async isFullyPaid(bookingId: number): Promise<boolean> {
    const result = await query(
      `SELECT 
        b.total_amount + b.deposit_amount as required_amount,
        COALESCE(SUM(CASE WHEN p.status = 'completed' AND p.payment_type != 'refund' THEN p.amount ELSE 0 END), 0) as paid_amount
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = $1
      GROUP BY b.id, b.total_amount, b.deposit_amount`,
      [bookingId]
    );

    if (result.rows.length === 0) return false;

    const { required_amount, paid_amount } = result.rows[0];
    return paid_amount >= required_amount;
  }
}
