import { db } from '../../db';
import { Booking } from '../../types';

export async function getBooking(bookingId: number): Promise<Booking | null> {
  const result = await db.query(
    `SELECT b.*, u.email, u.name, u.phone, p.name as product_name, c.compartment_number, l.name as locker_name
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN products p ON b.product_id = p.id
     JOIN compartments c ON b.compartment_id = c.id
     JOIN lockers l ON c.locker_id = l.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
