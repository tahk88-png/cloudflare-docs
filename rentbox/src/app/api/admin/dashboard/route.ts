import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Dashboard Stats
    const overdueBookings = await prisma.booking.count({
      where: {
        status: 'ACTIVE',
        endTime: { lt: new Date() }
      }
    });

    const pendingTickets = await prisma.ticket.count({
      where: { status: 'OPEN' }
    });

    const recentActions = await prisma.aiAction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      overdueBookings,
      pendingTickets,
      recentActions
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
