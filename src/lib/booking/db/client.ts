// Database client for PostgreSQL
// Uses pg library for connection pooling

// Note: Install pg with: npm install pg @types/pg
// For Cloudflare Workers, consider using @cloudflare/d1 or postgres.js instead

// This is a placeholder implementation
// Replace with actual pg Pool or your database client of choice
interface PoolClient {
	query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
	release(): void;
}

interface Pool {
	connect(): Promise<PoolClient>;
	query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
	end(): Promise<void>;
}

// Mock Pool implementation - replace with actual pg.Pool
class MockPool implements Pool {
	async connect(): Promise<PoolClient> {
		throw new Error('Database not configured. Install pg and configure DATABASE_URL.');
	}
	async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
		throw new Error('Database not configured. Install pg and configure DATABASE_URL.');
	}
	async end(): Promise<void> {}
}

const { Pool } = (() => {
	try {
		// Try to import pg
		const pg = require('pg');
		return pg;
	} catch {
		// Return mock if pg is not installed
		return { Pool: MockPool };
	}
})();

// Database connection pool
let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL;
		
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable is not set');
		}

		pool = new Pool({
			connectionString,
			max: 20, // Maximum number of clients in the pool
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		// Handle pool errors
		pool.on('error', (err) => {
			console.error('Unexpected error on idle client', err);
		});
	}

	return pool;
}

export async function query<T = any>(
	text: string,
	params?: any[]
): Promise<pg.QueryResult<T>> {
	const db = getDbPool();
	return db.query<T>(text, params);
}

export async function transaction<T>(
	callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
	const db = getDbPool();
	const client = await db.connect();
	
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
}

export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
