// ═══════════════════════════════════════════════════════════════════════════
// DATABASE MIGRATION RUNNER
// ═══════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('Running database migrations...\n');
  
  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Get list of migration files
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  // Get already executed migrations
  const executed = await query<{ name: string }>('SELECT name FROM _migrations');
  const executedNames = new Set(executed.rows.map(r => r.name));
  
  // Run pending migrations
  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`  ✓ ${file} (already executed)`);
      continue;
    }
    
    console.log(`  → Running ${file}...`);
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    try {
      await query(sql);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`  ✓ ${file} completed`);
    } catch (error) {
      console.error(`  ✗ ${file} failed:`, error);
      throw error;
    }
  }
  
  console.log('\nMigrations completed successfully!');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => pool.end());
