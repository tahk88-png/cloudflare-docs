import prisma from '../prisma';

export async function runOwnerAgent(query: string) {
  const lowerQuery = query.toLowerCase();

  // 1. RISK QUERY
  if (lowerQuery.includes('risk') || lowerQuery.includes('risky')) {
    const riskyBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['IN_USE', 'PENDING_PAYMENT', 'READY_FOR_PICKUP'] },
        riskScore: { gt: 50 }
      },
      orderBy: { riskScore: 'desc' },
      take: 5,
      include: { user: true, product: true }
    });

    if (riskyBookings.length === 0) return "No high-risk bookings found today.";

    return riskyBookings.map(b => 
      `Booking ${b.id.slice(0,4)} (Score: ${b.riskScore}): ${b.user.email} renting ${b.product.name}. Status: ${b.status}`
    ).join('\n');
  }

  // 2. ISSUES / MAINTENANCE
  if (lowerQuery.includes('wrong') || lowerQuery.includes('issue') || lowerQuery.includes('fail')) {
    const recentTickets = await prisma.ticket.findMany({
      where: { status: 'OPEN' },
      take: 3
    });
    const failedEvents = await prisma.event.count({
      where: { status: 'failed', createdAt: { gt: new Date(Date.now() - 24*60*60*1000) } }
    });

    return `Recent Issues:\n- ${recentTickets.length} Open Tickets\n- ${failedEvents} Failed System Events (last 24h)`;
  }

  // 3. REVENUE / PERFORMANCE
  if (lowerQuery.includes('roi') || lowerQuery.includes('perform')) {
    // Mock aggregation
    return "Top Performer: Makita Drill (95% utilization).\nUnderperformer: Pressure Washer (10% utilization). Suggest running a promo.";
  }

  return "I can analyze Risk, Issues, or Performance. What would you like to know, Indrek?";
}
