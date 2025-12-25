import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BookingStatus, PaymentStatus, TicketStatus } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

// GET /api/admin/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const week = subDays(now, 7);

    // Execute all queries in parallel
    const [
      overdueBookings,
      openFailedEvents,
      pendingPayments,
      activeBookings,
      openTickets,
      recentActions,
      bookingsByStatus,
      ticketsByPriority,
      eventsThisWeek,
      messagesThisWeek,
    ] = await Promise.all([
      // Overdue bookings with details
      prisma.booking.findMany({
        where: { status: BookingStatus.OVERDUE },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          product: { select: { id: true, name: true } },
          compartment: {
            include: { locker: { select: { id: true, name: true, location: true } } },
          },
        },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),

      // Recent locker open failed events
      prisma.event.findMany({
        where: {
          type: 'LOCKER_OPEN_FAILED',
          createdAt: { gte: week },
        },
        include: {
          booking: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
              compartment: {
                include: { locker: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Pending payments
      prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING },
        include: {
          booking: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
              product: { select: { name: true } },
              startDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Active bookings count
      prisma.booking.count({ where: { status: BookingStatus.ACTIVE } }),

      // Open tickets count
      prisma.ticket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),

      // Recent AI actions
      prisma.aiAction.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          reason: true,
          outcome: true,
          agentRole: true,
          createdAt: true,
        },
      }),

      // Bookings by status (summary)
      prisma.booking.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Tickets by priority
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: true,
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),

      // Events this week
      prisma.event.count({ where: { createdAt: { gte: week } } }),

      // Messages this week
      prisma.message.count({ where: { createdAt: { gte: week } } }),
    ]);

    // Calculate risk metrics
    const riskMetrics = {
      overdueCount: overdueBookings.length,
      openFailedCount: openFailedEvents.length,
      pendingPaymentsCount: pendingPayments.length,
      pendingPaymentsTotal: pendingPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount.toString()),
        0
      ),
    };

    // Build status summaries
    const bookingStatusSummary = bookingsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const ticketPrioritySummary = ticketsByPriority.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      risk: {
        overdueBookings: overdueBookings.map(b => ({
          id: b.id,
          customer: b.user.name,
          email: b.user.email,
          phone: b.user.phone,
          product: b.product.name,
          locker: b.compartment.locker.name,
          location: b.compartment.locker.location,
          compartment: b.compartment.number,
          endDate: b.endDate,
          daysOverdue: Math.ceil((now.getTime() - new Date(b.endDate).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        openFailedEvents: openFailedEvents.map(e => ({
          id: e.id,
          bookingId: e.bookingId,
          customer: e.booking?.user?.name,
          locker: e.booking?.compartment?.locker?.name,
          createdAt: e.createdAt,
          payload: e.payload,
        })),
        pendingPayments: pendingPayments.map(p => ({
          id: p.id,
          bookingId: p.bookingId,
          customer: p.booking?.user?.name,
          product: p.booking?.product?.name,
          amount: p.amount,
          startDate: p.booking?.startDate,
          createdAt: p.createdAt,
        })),
      },
      metrics: riskMetrics,
      summary: {
        activeBookings,
        openTickets,
        eventsThisWeek,
        messagesThisWeek,
        bookingsByStatus: bookingStatusSummary,
        ticketsByPriority: ticketPrioritySummary,
      },
      recentActions,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
