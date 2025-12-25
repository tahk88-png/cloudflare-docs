import { dbQuery } from "../db";
import { isUuid } from "../uuid";

export type BookingRow = {
  id: string;
  external_id: string | null;
  user_id: string | null;
  product_id: string | null;
  compartment_id: string;
  start_at: string;
  end_at: string;
  status: "active" | "cancelled" | "completed";
  paid: boolean;
  metadata: unknown;
};

export async function getBookingByIdOrExternal(bookingIdOrExternal: string): Promise<BookingRow | null> {
  if (isUuid(bookingIdOrExternal)) {
    const byId = await dbQuery<BookingRow>("select * from bookings where id = $1 limit 1", [
      bookingIdOrExternal
    ]);
    return byId.rows[0] ?? null;
  }

  const byExternal = await dbQuery<BookingRow>("select * from bookings where external_id = $1 limit 1", [
    bookingIdOrExternal
  ]);
  return byExternal.rows[0] ?? null;
}

export async function getBookingRiskCounts() {
  const q = await dbQuery<{
    overdue: number;
    open_failed: number;
    payment_pending: number;
  }>(
    `
    with
      overdue as (
        select count(*)::int as c
        from bookings
        where status = 'active'
          and end_at < now()
      ),
      open_failed as (
        select count(distinct booking_id)::int as c
        from events
        where type = 'locker.open_failed'
          and created_at > now() - interval '24 hours'
          and booking_id is not null
      ),
      payment_pending as (
        select count(*)::int as c
        from bookings b
        where b.status = 'active'
          and b.paid = false
      )
    select
      (select c from overdue) as overdue,
      (select c from open_failed) as open_failed,
      (select c from payment_pending) as payment_pending
    `
  );
  return q.rows[0] ?? { overdue: 0, open_failed: 0, payment_pending: 0 };
}

export async function setBookingPaid(bookingId: string, paid: boolean) {
  await dbQuery(`update bookings set paid = $2 where id = $1`, [bookingId, paid]);
}

