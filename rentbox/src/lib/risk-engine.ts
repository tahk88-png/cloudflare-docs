import prisma from './prisma';

interface RiskFactors {
  isNewCustomer: boolean;
  hasOverdueHistory: boolean;
  isNightRental: boolean;
  productValue: number;
}

export async function calculateRiskScore(bookingId: string): Promise<number> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        include: {
          bookings: true
        }
      },
      product: true
    }
  });

  if (!booking) return 0;

  let score = 0;

  // 1. New Customer? (First booking)
  // If only 1 booking (the current one) or 0 completed/paid others
  const pastBookings = booking.user.bookings.filter(b => b.id !== booking.id && (b.status === 'COMPLETED' || b.status === 'RETURNED'));
  if (pastBookings.length === 0) {
    score += 30; // High risk for completely new users
  }

  // 2. Overdue History?
  const hasOverdue = booking.user.bookings.some(b => b.status === 'OVERDUE' || b.status === 'DISPUTE');
  if (hasOverdue) {
    score += 40;
  }

  // 3. Time of Day (Night rentals 22:00 - 06:00 are riskier)
  const hour = booking.startTime.getHours();
  if (hour >= 22 || hour < 6) {
    score += 20;
  }

  // 4. Product Value (Price > 50 is riskier)
  if (Number(booking.product.price) > 50) {
    score += 10;
  }

  // Cap at 100
  return Math.min(score, 100);
}

export async function assessRiskAction(bookingId: string) {
  const score = await calculateRiskScore(bookingId);
  
  await prisma.booking.update({
    where: { id: bookingId },
    data: { riskScore: score }
  });

  return {
    score,
    level: score < 30 ? 'LOW' : score < 70 ? 'MEDIUM' : 'HIGH'
  };
}
