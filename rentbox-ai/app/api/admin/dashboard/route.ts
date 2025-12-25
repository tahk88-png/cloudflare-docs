import { NextRequest, NextResponse } from 'next/server';
import { BookingRepository } from '@/lib/repositories/bookings';
import { TicketRepository } from '@/lib/repositories/tickets';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get overdue bookings
    const overdueBookings = await BookingRepository.findOverdue();

    // Get open locker failures from events
    const lockerFailuresResult = await query(
      `SELECT 
        COUNT(*) as count,
        entity_id as booking_id,
        payload
       FROM events
       WHERE event_type = 'locker.open_failed'
         AND processed = false
       GROUP BY entity_id, payload
       ORDER BY count DESC
       LIMIT 10`
    );

    // Get pending payments
    const pendingPaymentsResult = await query(
      `SELECT 
        b.id,
        b.user_id,
        b.status,
        b.start_time,
        b.total_amount,
        u.email,
        u.full_name,
        p.name as product_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN products p ON b.product_id = p.id
       LEFT JOIN payments pay ON b.id = pay.booking_id AND pay.status = 'completed'
       WHERE b.status IN ('pending', 'confirmed')
         AND pay.id IS NULL
       ORDER BY b.start_time ASC
       LIMIT 20`
    );

    // Get high priority tickets
    const highPriorityTickets = await TicketRepository.findAll({
      priority: 'high',
      status: 'open',
      limit: 20
    });

    const urgentTickets = await TicketRepository.findAll({
      priority: 'urgent',
      status: 'open',
      limit: 20
    });

    // Dashboard metrics
    const metricsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM bookings WHERE status = 'overdue') as overdue_count,
        (SELECT COUNT(*) FROM events WHERE event_type = 'locker.open_failed' AND processed = false) as locker_failure_count,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending' AND start_time < NOW() + INTERVAL '24 hours') as pending_payment_count,
        (SELECT COUNT(*) FROM tickets WHERE status = 'open' AND priority IN ('high', 'urgent')) as critical_tickets_count,
        (SELECT COUNT(*) FROM bookings WHERE status = 'active') as active_rentals_count
    `);

    const metrics = metricsResult.rows[0];

    return NextResponse.json({
      success: true,
      dashboard: {
        metrics: {
          overdue_bookings: parseInt(metrics.overdue_count),
          locker_failures: parseInt(metrics.locker_failure_count),
          pending_payments: parseInt(metrics.pending_payment_count),
          critical_tickets: parseInt(metrics.critical_tickets_count),
          active_rentals: parseInt(metrics.active_rentals_count)
        },
        risks: {
          overdue_bookings: overdueBookings,
          locker_failures: lockerFailuresResult.rows,
          pending_payments: pendingPaymentsResult.rows
        },
        tickets: {
          urgent: urgentTickets,
          high_priority: highPriorityTickets
        }
      }
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
