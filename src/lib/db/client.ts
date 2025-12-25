// Database client for Cloudflare D1
// This assumes D1 binding is available in the environment

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	exec(query: string): Promise<D1ExecResult>;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<D1Result>;
	all<T = unknown>(): Promise<D1Result<T>>;
	raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
	success: boolean;
	meta: {
		duration: number;
		rows_read: number;
		rows_written: number;
		last_row_id: number;
		changes: number;
	};
	results?: T[];
}

export interface D1ExecResult {
	count: number;
	duration: number;
}

// Helper to get D1 database from environment
export function getDB(env: { DB?: D1Database }): D1Database {
	if (!env.DB) {
		throw new Error("D1 database not configured. Make sure D1 binding is set up in wrangler.toml");
	}
	return env.DB;
}

// Helper to get DB from Astro context
export function getDBFromContext(context: { locals?: any; runtime?: any }): D1Database {
	// Try different ways to access the DB binding
	const env = 
		context.runtime?.env ||
		(context.locals as any)?.runtime?.env ||
		(context.locals as any)?.env ||
		{};
	
	return getDB(env);
}
