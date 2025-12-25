import cron from 'node-cron';
import { db } from '../lib/db';
import { sendEmail, renderTemplate as renderEmailTemplate } from '../lib/email';
import { sendSMS, renderTemplate as renderSMSTemplate } from '../lib/sms';
import { createTicket } from '../lib/ai/tools/create-ticket';
import { logAIAction } from '../lib/ai/tools/log-action';
import { getTemplate } from '../lib/templates';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled reminders...');
  await processScheduledReminders();
});

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Checking overdue bookings...');
  await processOverdueBookings();
});

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Processing failed opens...');
  await processFailedOpens();
});

async function processScheduledReminders(): Promise<void> {
  // Send 24h reminders for bookings ending tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const bookingsResult = await db.query(
    `SELECT b.*, u.email, u.name, u.phone, p.name as product_name, c.compartment_number, l.location as locker_location
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN products p ON b.product_id = p.id
     JOIN compartments c ON b.compartment_id = c.id
     JOIN lockers l ON c.locker_id = l.id
     WHERE b.status = 'active'
       AND b.end_time >= $1
       AND b.end_time <= $2
       AND NOT EXISTS (
         SELECT 1 FROM ai_actions
         WHERE booking_id = b.id
           AND action_type = 'reminder_24h_sent'
           AND created_at > NOW() - INTERVAL '1 day'
       )`,
    [tomorrow, tomorrowEnd]
  );

  for (const booking of bookingsResult.rows) {
    try {
      const template = await getTemplate('reminder_24h');
      if (template) {
        const variables = {
          user_name: booking.name,
          booking_id: booking.id,
          end_time: new Date(booking.end_time).toLocaleString(),
        };

        if (booking.email) {
          await sendEmail({
            to: booking.email,
            subject: template.subject || 'Reminder: Your Rentbox Booking',
            html: renderEmailTemplate(template.content, variables),
          });
        }

        if (booking.phone) {
          const smsTemplate = await getTemplate('pickup_sms');
          if (smsTemplate) {
            await sendSMS({
              to: booking.phone,
              body: renderSMSTemplate(smsTemplate.content, {
                ...variables,
                pickup_code: booking.pickup_code,
                locker_location: booking.locker_location,
              }),
            });
          }
        }

        await logAIAction({
          actionType: 'reminder_24h_sent',
          userId: booking.user_id,
          bookingId: booking.id,
          reason: 'Scheduled 24h reminder',
          outcome: 'Reminder sent successfully',
        });
      }
    } catch (error) {
      console.error(`Error sending reminder for booking ${booking.id}:`, error);
    }
  }
}

async function processOverdueBookings(): Promise<void> {
  // Find overdue bookings and send notices
  const overdueResult = await db.query(
    `SELECT b.*, u.email, u.name, u.phone
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.status = 'active'
       AND b.end_time < NOW()
       AND NOT EXISTS (
         SELECT 1 FROM ai_actions
         WHERE booking_id = b.id
           AND action_type = 'overdue_notice_sent'
           AND created_at > NOW() - INTERVAL '1 day'
       )`,
    []
  );

  for (const booking of overdueResult.rows) {
    try {
      const template = await getTemplate('overdue_notice');
      if (template) {
        const variables = {
          user_name: booking.name,
          booking_id: booking.id,
        };

        if (booking.email) {
          await sendEmail({
            to: booking.email,
            subject: template.subject || 'Action Required: Overdue Booking',
            html: renderEmailTemplate(template.content, variables),
          });
        }

        await logAIAction({
          actionType: 'overdue_notice_sent',
          userId: booking.user_id,
          bookingId: booking.id,
          reason: 'Booking is overdue',
          outcome: 'Overdue notice sent',
        });
      }
    } catch (error) {
      console.error(`Error sending overdue notice for booking ${booking.id}:`, error);
    }
  }
}

async function processFailedOpens(): Promise<void> {
  // Check for repeated open_failed events and create tickets
  const failedOpensResult = await db.query(
    `SELECT booking_id, COUNT(*) as fail_count
     FROM events
     WHERE event_type = 'open_failed'
       AND processed = false
       AND created_at > NOW() - INTERVAL '1 hour'
     GROUP BY booking_id
     HAVING COUNT(*) >= 3`,
    []
  );

  for (const row of failedOpensResult.rows) {
    try {
      const bookingResult = await db.query(
        `SELECT b.*, u.id as user_id, u.email, u.name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.id = $1`,
        [row.booking_id]
      );

      if (bookingResult.rows.length === 0) continue;

      const booking = bookingResult.rows[0];

      // Check if ticket already exists
      const existingTicket = await db.query(
        `SELECT id FROM tickets
         WHERE booking_id = $1
           AND status IN ('open', 'in_progress')
           AND created_at > NOW() - INTERVAL '1 day'`,
        [row.booking_id]
      );

      if (existingTicket.rows.length === 0) {
        await createTicket({
          userId: booking.user_id,
          bookingId: booking.id,
          title: `Repeated locker open failures - Booking #${booking.id}`,
          description: `Customer has attempted to open locker ${row.fail_count} times without success.`,
          priority: 'high',
        });

        await logAIAction({
          actionType: 'create_ticket_auto',
          userId: booking.user_id,
          bookingId: booking.id,
          reason: `Repeated open_failed events (${row.fail_count} attempts)`,
          outcome: 'Ticket created automatically',
        });
      }

      // Mark events as processed
      await db.query(
        `UPDATE events SET processed = true
         WHERE booking_id = $1 AND event_type = 'open_failed' AND processed = false`,
        [row.booking_id]
      );
    } catch (error) {
      console.error(`Error processing failed opens for booking ${row.booking_id}:`, error);
    }
  }
}

console.log('Worker started. Scheduled jobs:');
console.log('- Hourly: Process scheduled reminders');
console.log('- Every 15 minutes: Check overdue bookings');
console.log('- Every 5 minutes: Process failed opens');

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Worker shutting down...');
  process.exit(0);
});
