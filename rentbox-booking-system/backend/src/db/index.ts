// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION AND QUERY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rentbox',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection event handlers
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Database pool: new client connected');
});

// ═══════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a single query
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Get a single row or null
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Get multiple rows
 */
export async function queryMany<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a function within a database transaction
 * Automatically handles commit/rollback
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query within an existing transaction
 */
export async function txQuery<T = unknown>(
  client: PoolClient,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return client.query<T>(text, params);
}

/**
 * Get a single row within a transaction
 */
export async function txQueryOne<T = unknown>(
  client: PoolClient,
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await txQuery<T>(client, text, params);
  return result.rows[0] || null;
}

/**
 * Get multiple rows within a transaction
 */
export async function txQueryMany<T = unknown>(
  client: PoolClient,
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await txQuery<T>(client, text, params);
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVISORY LOCKS (for distributed locking)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Acquire an advisory lock (blocking)
 */
export async function acquireLock(client: PoolClient, lockId: number): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [lockId]);
}

/**
 * Try to acquire an advisory lock (non-blocking)
 */
export async function tryAcquireLock(client: PoolClient, lockId: number): Promise<boolean> {
  const result = await client.query<{ pg_try_advisory_xact_lock: boolean }>(
    'SELECT pg_try_advisory_xact_lock($1)',
    [lockId]
  );
  return result.rows[0].pg_try_advisory_xact_lock;
}

/**
 * Generate a consistent lock ID from a string (e.g., compartment ID)
 */
export function generateLockId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAINTENANCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clean up expired locks and carts
 */
export async function cleanupExpired(): Promise<{ locks: number; carts: number }> {
  const locksResult = await query('DELETE FROM cart_locks WHERE expires_at < NOW()');
  const cartsResult = await query(
    `UPDATE carts SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()`
  );
  
  return {
    locks: locksResult.rowCount || 0,
    carts: cartsResult.rowCount || 0,
  };
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export { pool };
