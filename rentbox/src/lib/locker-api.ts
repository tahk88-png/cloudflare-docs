import prisma from './prisma';
import { openCompartmentGateway, getLockerStatusGateway } from './locker-gateway';
import { randomUUID } from 'crypto';

export async function openLocker(
    lockerId: string, 
    compartmentId: string, 
    bookingId: string, 
    isOverride: boolean = false
) {
  console.log(`[LOCKER-API] Request to open ${lockerId}/${compartmentId} for booking ${bookingId} (Override: ${isOverride})`);

  // 1. Fetch Context
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { compartment: true }
  });

  if (!booking) throw new Error("Booking not found");

  // 2. Policy Checks (Skip if Override)
  if (!isOverride) {
      // A. Status Check
      const allowedStatuses = ['PAID', 'READY_FOR_PICKUP', 'IN_USE', 'PICKED_UP'];
      if (!allowedStatuses.includes(booking.status)) {
          throw new Error(`Policy Violation: Status ${booking.status} not allowed.`);
      }

      // B. Compartment Match
      if (booking.compartmentId !== compartmentId) {
          throw new Error("Policy Violation: Compartment mismatch.");
      }

      // C. Time Window [Start - 30m, End + 15m]
      const now = new Date();
      const startWindow = new Date(booking.startTime.getTime() - 30 * 60000);
      const endWindow = new Date(booking.endTime.getTime() + 15 * 60000);

      if (now < startWindow || now > endWindow) {
          throw new Error("Policy Violation: Outside access window.");
      }

      // D. Risk Score < 80
      if (booking.riskScore >= 80) {
          throw new Error("Policy Violation: High Risk Block. Contact Support.");
      }

      // E. Rate Limit: < 2 attempts in last 10 min
      const tenMinsAgo = new Date(now.getTime() - 10 * 60000);
      const recentAttempts = await prisma.lockerOpenAttempt.count({
          where: {
              bookingId,
              createdAt: { gt: tenMinsAgo }
          }
      });

      if (recentAttempts >= 2) {
           throw new Error("Policy Violation: Too many open attempts. Please wait.");
      }
  }

  // 3. Create Attempt Record
  const correlationId = randomUUID();
  await prisma.lockerOpenAttempt.create({
      data: {
          bookingId,
          lockerId,
          compartmentId,
          correlationId,
          status: 'PENDING',
          isOverride,
          requestedBy: isOverride ? 'admin' : 'user', // Basic assumption
          reason: isOverride ? 'manual_override' : 'user_request'
      }
  });

  // 4. Call Gateway
  try {
      const gatewayRes = await openCompartmentGateway(lockerId, compartmentId, correlationId);
      if (!gatewayRes.success) {
          await prisma.lockerOpenAttempt.update({
              where: { correlationId },
              data: { status: 'FAILURE', errorDetails: gatewayRes.message }
          });
          throw new Error(`Gateway Error: ${gatewayRes.message}`);
      }
      return { success: true, correlationId };
  } catch (e: any) {
       await prisma.lockerOpenAttempt.update({
          where: { correlationId },
          data: { status: 'FAILURE', errorDetails: e.message }
      });
      throw e;
  }
}

export async function getLockerStatus(lockerId: string) {
  return await getLockerStatusGateway(lockerId);
}
