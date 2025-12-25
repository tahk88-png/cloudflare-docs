import { dbQuery } from "../db";

export type BookingContextRow = {
  booking_id: string;
  booking_external_id: string | null;
  booking_start_at: string;
  booking_end_at: string;
  booking_paid: boolean;
  booking_status: string;
  user_id: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_name: string | null;
  locker_id: string;
  locker_name: string;
  locker_location: string | null;
  compartment_id: string;
  compartment_code: string;
};

export async function getBookingContext(bookingId: string): Promise<BookingContextRow | null> {
  const q = await dbQuery<BookingContextRow>(
    `
    select
      b.id as booking_id,
      b.external_id as booking_external_id,
      b.start_at as booking_start_at,
      b.end_at as booking_end_at,
      b.paid as booking_paid,
      b.status as booking_status,
      u.id as user_id,
      u.email as user_email,
      u.phone as user_phone,
      u.name as user_name,
      l.id as locker_id,
      l.name as locker_name,
      l.location as locker_location,
      c.id as compartment_id,
      c.code as compartment_code
    from bookings b
    join compartments c on c.id = b.compartment_id
    join lockers l on l.id = c.locker_id
    left join users u on u.id = b.user_id
    where b.id = $1
    limit 1
    `,
    [bookingId]
  );
  return q.rows[0] ?? null;
}

