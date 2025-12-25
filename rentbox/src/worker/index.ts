import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail, sendSms } from '../lib/notifications';

console.log('Worker started...');

// Schedule: Every minute
cron.schedule('* * * * *', async () => {
  console.log('Running scheduled checks...');
  const now = new Date();
  
  // 1. Check for Overdue Bookings
  // Active bookings where endTime < now
  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: 'ACTIVE',
      endTime: { lt: now }
    },
    include: { user: true }
  });

  for (const booking of overdueBookings) {
    console.log(`Booking ${booking.id} is overdue.`);
    // Send Notice
    await sendSms(booking.user.phone || '', "Your rental is overdue. Please return immediately to avoid penalties.");
    
    // Create Ticket if very late (> 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (booking.endTime < oneHourAgo) {
        // Check if ticket already exists? 
        // For simplicity, just log action or upsert logic (omitted for brevity)
        await prisma.aiAction.create({
            data: {
                type: 'ticket',
                reason: 'Booking overdue > 1h',
                outcome: 'flagged_risk'
            }
        });
    }
  }

  // 2. Reminders (e.g. 15 mins before end)
  const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);
  const fourteenMinsFromNow = new Date(now.getTime() + 14 * 60 * 1000); // 1 minute window

  const reminders = await prisma.booking.findMany({
    where: {
      status: 'ACTIVE',
      endTime: {
        gte: fourteenMinsFromNow,
        lte: fifteenMinsFromNow
      }
    },
    include: { user: true }
  });

  for (const booking of reminders) {
    await sendSms(booking.user.phone || '', "Your rental ends in 15 minutes.");
  }
});
