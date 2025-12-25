import pg from "pg";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __rentboxPool: pg.Pool | undefined;
}

export function dbPool(): pg.Pool {
  if (globalThis.__rentboxPool) return globalThis.__rentboxPool;
  const { DATABASE_URL } = env();
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 10
  });
  globalThis.__rentboxPool = pool;
  return pool;
}

export async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = dbPool();
  return pool.query<T>(text, params as any);
}

