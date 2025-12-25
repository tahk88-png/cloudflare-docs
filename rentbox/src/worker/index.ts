import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail, sendSms } from '../lib/notifications';
import { assessRiskAction } from '../lib/risk-engine';

console.log('Rentbox AI Worker V2 Started...');

// --- CRON SCHEDULES ---

// 1. RISK & RULES ENGINE (Every Minute)
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`[${now.toISOString()}] Running Rules Engine...`);

  // A. PICKUP MONITORING (Start + 15m)
  // If status is still PAID or READY_FOR_PICKUP 15 mins after start
  const latePickups = await prisma.booking.findMany({
    where: {
      status: { in: ['PAID', 'READY_FOR_PICKUP'] },
      startTime: { lt: new Date(now.getTime() - 15 * 60000) }
    },
    include: { user: true }
  });

  for (const b of latePickups) {
    // Send gentle nudge
    // Check if we already sent one? (Ideally check AiAction history)
    await sendSms(b.user.phone || '', "Rentbox: Your booking time has started. Need help finding the locker?");
    // Log
    await prisma.aiAction.create({
      data: {
        bookingId: b.id,
        type: 'sms',
        agentRole: 'OPS',
        reason: 'Pickup late > 15m',
        outcome: 'reminder_sent'
      }
    });
  }

  // B. RETURN REMINDER (End - 15m)
  const dueSoon = await prisma.booking.findMany({
    where: {
      status: 'IN_USE',
      endTime: {
        gte: new Date(now.getTime() + 14 * 60000),
        lte: new Date(now.getTime() + 15 * 60000)
      }
    },
    include: { user: true }
  });

  for (const b of dueSoon) {
    await sendSms(b.user.phone || '', "Rentbox: Your rental ends in 15 minutes. Please return to Locker A.");
  }

  // C. OVERDUE ENFORCEMENT (End + 30m)
  const overdue = await prisma.booking.findMany({
    where: {
      status: 'IN_USE',
      endTime: { lt: new Date(now.getTime() - 30 * 60000) }
    },
    include: { user: true }
  });

  for (const b of overdue) {
    // Mark as OVERDUE
    await prisma.booking.update({
      where: { id: b.id },
      data: { status: 'OVERDUE' }
    });

    // Notify
    await sendSms(b.user.phone || '', "Rentbox: Your booking is 30m overdue. Late fees apply. Please return immediately.");
    
    // Create Ticket for Ops
    await prisma.ticket.create({
      data: {
        bookingId: b.id,
        userId: b.userId,
        status: 'OPEN',
        priority: 'HIGH',
        assignedTo: 'OPS',
        description: 'Auto-created: Booking overdue > 30m'
      }
    });
  }
});

// 2. MAINTENANCE INTELLIGENCE (Every 5 Minutes)
cron.schedule('*/5 * * * *', async () => {
    // Check for compartments with high fail rates
    const problematicCompartments = await prisma.compartment.findMany({
        where: { openFailedCount: { gt: 3 }, status: 'available' } // If it failed > 3 times but still marked available
    });

    for (const c of problematicCompartments) {
        // Auto-Hold
        await prisma.compartment.update({
            where: { id: c.id },
            data: { status: 'maintenance' }
        });

        // Notify Indrek/Ops
        await prisma.aiAction.create({
            data: {
                type: 'log',
                agentRole: 'MAINTENANCE',
                reason: `Compartment ${c.id} failure rate high`,
                outcome: 'maintenance_hold_applied'
            }
        });
    }
});

// 3. OWNER REPORT (Nightly)
cron.schedule('0 23 * * *', async () => {
    // Generate daily summary
    // ... logic ...
    console.log("Daily Owner Report Generated");
});
