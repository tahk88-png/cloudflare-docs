import prisma from './prisma';

const RISK_WEIGHTS = {
  NEW_CUSTOMER: 30,
  PAST_OVERDUE: 40,
  NIGHT_RENTAL: 20, // 22:00 - 06:00
  HIGH_VALUE_ITEM: 15, // Price > 50
  BAD_FEEDBACK: 25, // Avg rating < 3
  OPEN_FAILED_SPIKE: 50, // Recent open failures
};

export async function calculateRiskScore(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        include: {
          bookings: true,
          feedback: true
        }
      },
      product: true,
      compartment: true
    }
  });

  if (!booking) return { score: 0, flags: {} };

  let score = 0;
  const flags: Record<string, boolean> = {};

  // 1. New Customer
  const completedBookings = booking.user.bookings.filter(b => b.status === 'COMPLETED' || b.status === 'RETURNED');
  if (completedBookings.length === 0) {
    score += RISK_WEIGHTS.NEW_CUSTOMER;
    flags.new_customer = true;
  }

  // 2. Overdue History
  const hasOverdue = booking.user.bookings.some(b => b.status === 'OVERDUE' || b.status === 'DISPUTE');
  if (hasOverdue) {
    score += RISK_WEIGHTS.PAST_OVERDUE;
    flags.past_overdue = true;
  }

  // 3. Time of Day
  const hour = booking.startTime.getHours();
  if (hour >= 22 || hour < 6) {
    score += RISK_WEIGHTS.NIGHT_RENTAL;
    flags.night_rental = true;
  }

  // 4. Product Value
  if (Number(booking.product.price) > 50) {
    score += RISK_WEIGHTS.HIGH_VALUE_ITEM;
    flags.high_value = true;
  }

  // 5. Bad Feedback History
  const avgRating = booking.user.feedback.reduce((acc, f) => acc + f.rating, 0) / (booking.user.feedback.length || 1);
  if (booking.user.feedback.length > 0 && avgRating < 3) {
    score += RISK_WEIGHTS.BAD_FEEDBACK;
    flags.bad_feedback = true;
  }

  // 6. Compartment/Locker Reliability (Contextual)
  if (booking.compartment.openFailedCount > 2) {
    score += RISK_WEIGHTS.OPEN_FAILED_SPIKE;
    flags.locker_unreliable = true;
  }

  return { score: Math.min(score, 100), flags };
}

export async function assessRiskAction(bookingId: string) {
  const { score, flags } = await calculateRiskScore(bookingId);
  
  await prisma.booking.update({
    where: { id: bookingId },
    data: { 
        riskScore: score,
        riskFlags: flags
    }
  });

  return {
    score,
    level: score < 30 ? 'LOW' : score < 70 ? 'MEDIUM' : 'HIGH',
    flags
  };
}
