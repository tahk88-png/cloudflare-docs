import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get overdue bookings
    const overdueResult = await db.query(
      `SELECT COUNT(*) as count
       FROM bookings
       WHERE status = 'active' AND end_time < NOW()`
    );
    const overdue = parseInt(overdueResult.rows[0].count, 10);

    // Get open failed bookings
    const openFailedResult = await db.query(
      `SELECT COUNT(DISTINCT b.id) as count
       FROM bookings b
       JOIN events e ON b.id = e.booking_id
       WHERE e.event_type = 'open_failed' AND e.processed = false`
    );
    const openFailed = parseInt(openFailedResult.rows[0].count, 10);

    // Get payment pending
    const paymentPendingResult = await db.query(
      `SELECT COUNT(*) as count
       FROM payments
       WHERE status = 'pending' AND created_at > NOW() - INTERVAL '24 hours'`
    );
    const paymentPending = parseInt(paymentPendingResult.rows[0].count, 10);

    // Get open tickets
    const openTicketsResult = await db.query(
      `SELECT COUNT(*) as count
       FROM tickets
       WHERE status IN ('open', 'in_progress')`
    );
    const openTickets = parseInt(openTicketsResult.rows[0].count, 10);

    return NextResponse.json({
      risk: {
        overdue,
        open_failed,
        payment_pending: paymentPending,
      },
      tickets: {
        open: openTickets,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
