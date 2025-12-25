import cron from 'node-cron';
import { RulesEngine } from '../lib/automation/rules-engine';
import { closePool } from '../lib/db';

console.log('Rentbox AI Employee - Background Worker Starting...');

const rulesEngine = new RulesEngine();

// Process events every minute
cron.schedule('* * * * *', async () => {
  console.log('[Cron] Processing events...');
  try {
    await rulesEngine.processEvents();
  } catch (error) {
    console.error('[Cron] Error processing events:', error);
  }
});

// Process time-based rules every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('[Cron] Processing time-based rules...');
  try {
    await rulesEngine.processTimeBasedRules();
  } catch (error) {
    console.error('[Cron] Error processing time-based rules:', error);
  }
});

// Health check - log every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('[Health] Worker is running', new Date().toISOString());
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down worker gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down worker gracefully...');
  await closePool();
  process.exit(0);
});

console.log('Background worker started successfully!');
console.log('- Event processing: Every 1 minute');
console.log('- Time-based rules: Every 15 minutes');
console.log('- Health check: Every 5 minutes');
