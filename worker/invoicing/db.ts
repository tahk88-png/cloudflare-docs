import { nowIso } from "./http";

export type D1Row = Record<string, unknown>;

export async function dbGet<T extends D1Row>(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
) {
	const res = await db.prepare(sql).bind(...params).first<T>();
	return res ?? null;
}

export async function dbAll<T extends D1Row>(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
) {
	const res = await db.prepare(sql).bind(...params).all<T>();
	return res.results ?? [];
}

export async function dbRun(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
) {
	return await db.prepare(sql).bind(...params).run();
}

export async function dbBatch(db: D1Database, stmts: D1PreparedStatement[]) {
	return await db.batch(stmts);
}

export function asJson<T>(value: unknown, fallback: T): T {
	if (typeof value !== "string") return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

export function requireEnvString(v: string | undefined, name: string) {
	if (!v) throw new Error(`Missing env var: ${name}`);
	return v;
}

export function coerceIsoDateOrNull(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}

export function isoNow() {
	return nowIso();
}

