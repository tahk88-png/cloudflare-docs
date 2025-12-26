type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCache<T>(key: string): T | undefined {
	const hit = cache.get(key);
	if (!hit) return undefined;
	if (Date.now() > hit.expiresAt) {
		cache.delete(key);
		return undefined;
	}
	return hit.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
	cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache(prefix?: string) {
	if (!prefix) {
		cache.clear();
		return;
	}
	for (const k of cache.keys()) {
		if (k.startsWith(prefix)) cache.delete(k);
	}
}

export async function getOrSetInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const existing = inflight.get(key) as Promise<T> | undefined;
	if (existing) return existing;
	const p = fn().finally(() => inflight.delete(key));
	inflight.set(key, p as Promise<unknown>);
	return p;
}

