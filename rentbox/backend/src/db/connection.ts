import { Pool, PoolClient, QueryResult } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export interface DbClient extends PoolClient {
  // Add any custom methods here
}

export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (duration > 1000) {
    console.warn('Slow query detected:', { text, duration, rows: res.rowCount });
  }
  
  return res;
};

export const getClient = async (): Promise<DbClient> => {
  return pool.connect() as Promise<DbClient>;
};

export const transaction = async <T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

export default {
  query,
  getClient,
  transaction,
  healthCheck,
  pool,
};
