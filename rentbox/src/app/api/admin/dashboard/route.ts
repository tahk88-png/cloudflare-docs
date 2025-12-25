import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Stats
    const overdueBookings = await prisma.booking.count({
      where: { status: 'OVERDUE' }
    });

    const pendingTickets = await prisma.ticket.count({
      where: { status: 'OPEN' }
    });

    const activeBookings = await prisma.booking.count({
      where: { status: 'IN_USE' }
    });

    // 2. High Risk Bookings
    const highRiskBookings = await prisma.booking.findMany({
      where: { 
        riskScore: { gt: 50 },
        status: { not: 'COMPLETED' }
      },
      include: { user: true, product: true },
      take: 5
    });

    // 3. Maintenance Issues
    const maintenanceHolds = await prisma.compartment.count({
      where: { status: 'maintenance' }
    });

    // 4. AI Log
    const recentActions = await prisma.aiAction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      stats: {
        overdue: overdueBookings,
        tickets: pendingTickets,
        active: activeBookings,
        maintenance: maintenanceHolds
      },
      highRisk: highRiskBookings,
      recentActions
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
