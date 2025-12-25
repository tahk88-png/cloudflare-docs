import 'dotenv/config';
import * as cron from 'node-cron';
import { prisma } from '../lib/db';
import { processEvent, processScheduledRules, checkOverdueBookings, sendReturnReminders } from '../lib/rules/engine';

// Worker configuration
const WORKER_ENABLED = process.env.WORKER_ENABLED !== 'false';
const CRON_REMINDER_SCHEDULE = process.env.CRON_REMINDER_SCHEDULE || '0 */6 * * *'; // Every 6 hours
const CRON_OVERDUE_SCHEDULE = process.env.CRON_OVERDUE_SCHEDULE || '0 9 * * *'; // Daily at 9 AM
const CRON_EVENT_PROCESSING = '*/5 * * * *'; // Every 5 minutes
const CRON_SCHEDULED_RULES = '0 * * * *'; // Every hour

console.log('🤖 Rentbox AI Employee Worker v1.0');
console.log('===================================');

if (!WORKER_ENABLED) {
  console.log('⚠️ Worker is disabled. Set WORKER_ENABLED=true to enable.');
  process.exit(0);
}

// Track scheduled jobs
const jobs: cron.ScheduledTask[] = [];

// Process unprocessed events
async function processUnprocessedEvents(): Promise<void> {
  console.log('[Worker] Processing unprocessed events...');
  
  try {
    const events = await prisma.event.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    if (events.length === 0) {
      console.log('[Worker] No unprocessed events found');
      return;
    }

    console.log(`[Worker] Found ${events.length} unprocessed events`);

    for (const event of events) {
      try {
        await processEvent(event.id);
        console.log(`[Worker] Processed event ${event.id} (${event.type})`);
      } catch (error) {
        console.error(`[Worker] Failed to process event ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Worker] Error processing events:', error);
  }
}

// Initialize scheduled jobs
function initializeJobs(): void {
  console.log('\n📅 Initializing scheduled jobs...\n');

  // Event processing - every 5 minutes
  jobs.push(
    cron.schedule(CRON_EVENT_PROCESSING, async () => {
      console.log(`\n[${new Date().toISOString()}] Running: Event Processing`);
      await processUnprocessedEvents();
    }, {
      name: 'event-processing',
    })
  );
  console.log(`✓ Event Processing: ${CRON_EVENT_PROCESSING}`);

  // Scheduled rules - every hour
  jobs.push(
    cron.schedule(CRON_SCHEDULED_RULES, async () => {
      console.log(`\n[${new Date().toISOString()}] Running: Scheduled Rules`);
      await processScheduledRules();
    }, {
      name: 'scheduled-rules',
    })
  );
  console.log(`✓ Scheduled Rules: ${CRON_SCHEDULED_RULES}`);

  // Return reminders - configurable (default: every 6 hours)
  jobs.push(
    cron.schedule(CRON_REMINDER_SCHEDULE, async () => {
      console.log(`\n[${new Date().toISOString()}] Running: Return Reminders`);
      await sendReturnReminders();
    }, {
      name: 'return-reminders',
    })
  );
  console.log(`✓ Return Reminders: ${CRON_REMINDER_SCHEDULE}`);

  // Overdue check - configurable (default: daily at 9 AM)
  jobs.push(
    cron.schedule(CRON_OVERDUE_SCHEDULE, async () => {
      console.log(`\n[${new Date().toISOString()}] Running: Overdue Check`);
      await checkOverdueBookings();
    }, {
      name: 'overdue-check',
    })
  );
  console.log(`✓ Overdue Check: ${CRON_OVERDUE_SCHEDULE}`);

  // Health check - every minute
  jobs.push(
    cron.schedule('* * * * *', () => {
      // Silent health check - just keeps the process alive
    }, {
      name: 'health-check',
    })
  );

  console.log('\n✅ All jobs scheduled successfully\n');
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  // Stop all cron jobs
  for (const job of jobs) {
    job.stop();
  }

  // Disconnect from database
  await prisma.$disconnect();

  console.log('👋 Worker shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Main entry point
async function main(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected');

    // Initialize jobs
    initializeJobs();

    // Run initial event processing
    console.log('📥 Running initial event processing...\n');
    await processUnprocessedEvents();

    console.log('🚀 Worker is running. Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

main();
