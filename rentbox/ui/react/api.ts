import type { AdminFilters, ApiErrorShape, AvailabilityResponse, CalendarEvent, ISODate, Slot, TimeZone } from "./types";
import { getCache, getOrSetInflight, setCache } from "./cache";

export interface ApiClientOptions {
	baseUrl?: string;
	useMock?: boolean;
}

async function readError(res: Response): Promise<ApiErrorShape> {
	try {
		return (await res.json()) as ApiErrorShape;
	} catch {
		return { error: "api_error", message: `HTTP ${res.status}` };
	}
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});
	if (!res.ok) throw await readError(res);
	return (await res.json()) as T;
}

// -----------------------------------------
// Mock API (optional)
// -----------------------------------------
function mockSlots(date: ISODate, durationMinutes: number): Slot[] {
	// Returns a deterministic "mostly available" day with a lunch blockage.
	const start = new Date(`${date}T00:00:00.000Z`).getTime();
	const step = 30 * 60_000;
	const dur = durationMinutes * 60_000;
	const out: Slot[] = [];
	for (let i = 0; i < 24 * 2; i++) {
		const s = new Date(start + i * step).toISOString();
		const e = new Date(start + i * step + dur).toISOString();
		const hour = new Date(s).getUTCHours();
		const blocked = hour >= 10 && hour < 13;
		out.push({ start_at: s, end_at: e, is_available: !blocked && i % 7 !== 0 });
	}
	return out;
}

function mockEvents(from: string, to: string, lockerId?: number | null): CalendarEvent[] {
	const base = new Date(from).getTime();
	const mk = (mins: number) => new Date(base + mins * 60_000).toISOString();
	const events: CalendarEvent[] = [
		{
			id: 8123,
			scope: "booking",
			status: "paid",
			title: "Booking #8123",
			start_at: mk(9 * 60),
			end_at: mk(11 * 60),
			locker_id: lockerId ?? 7,
			compartment_id: 901,
			meta: { booking_id: 8123, product_id: 44, compartment_id: 901, locker_id: lockerId ?? 7 },
		},
		{
			id: 8124,
			scope: "booking",
			status: "overdue",
			title: "Booking #8124",
			start_at: mk(12 * 60),
			end_at: mk(14 * 60),
			locker_id: lockerId ?? 7,
			compartment_id: 902,
			meta: { booking_id: 8124, product_id: 44, compartment_id: 902, locker_id: lockerId ?? 7 },
		},
		{
			id: 55,
			scope: "maintenance",
			status: "active",
			title: "Maintenance: Door sensor replace",
			start_at: mk(15 * 60),
			end_at: mk(16 * 60 + 30),
			locker_id: lockerId ?? 7,
			compartment_id: 901,
			meta: { reason: "Sensor replacement" },
		},
		{
			id: 56,
			scope: "block",
			status: "active",
			title: "Block: Cleaning",
			start_at: mk(18 * 60),
			end_at: mk(19 * 60),
			locker_id: lockerId ?? 7,
			compartment_id: null,
			meta: { reason: "Cleaning" },
		},
	];
	return events.filter((e) => new Date(e.start_at) < new Date(to));
}

// -----------------------------------------
// Public client functions (cache + inflight)
// -----------------------------------------
export function createRentboxApiClient(opts?: ApiClientOptions) {
	const baseUrl = opts?.baseUrl?.replace(/\/$/, "") ?? "";
	const useMock = Boolean(opts?.useMock);

	return {
		async getProductSlots(params: {
			productId: number;
			date: ISODate;
			stepMinutes: number;
			durationMinutes: number;
			tz: TimeZone;
			signal?: AbortSignal;
			ttlMs?: number;
		}): Promise<Slot[]> {
			const ttlMs = params.ttlMs ?? 45_000;
			const key = `slots:${params.productId}:${params.date}:${params.stepMinutes}:${params.durationMinutes}:${params.tz}`;
			const cached = getCache<Slot[]>(key);
			if (cached) return cached;
			return await getOrSetInflight(key, async () => {
				const value = useMock
					? mockSlots(params.date, params.durationMinutes)
					: await fetchJson<Slot[]>(
							`${baseUrl}/api/products/${params.productId}/slots?date=${encodeURIComponent(
								params.date,
							)}&step_minutes=${params.stepMinutes}&duration_minutes=${params.durationMinutes}&tz=${encodeURIComponent(
								params.tz,
							)}`,
							{ signal: params.signal },
						);
				setCache(key, value, ttlMs);
				return value;
			});
		},

		async getAvailability(params: {
			productId: number;
			startAt: string;
			endAt: string;
			tz: TimeZone;
			signal?: AbortSignal;
			ttlMs?: number;
		}): Promise<AvailabilityResponse> {
			const ttlMs = params.ttlMs ?? 30_000;
			const key = `availability:${params.productId}:${params.startAt}:${params.endAt}:${params.tz}`;
			const cached = getCache<AvailabilityResponse>(key);
			if (cached) return cached;
			return await getOrSetInflight(key, async () => {
				const value = useMock
					? { available: false, next_available_at: new Date(Date.now() + 2 * 3600_000).toISOString() }
					: await fetchJson<AvailabilityResponse>(
							`${baseUrl}/api/products/${params.productId}/availability?start_at=${encodeURIComponent(
								params.startAt,
							)}&end_at=${encodeURIComponent(params.endAt)}&tz=${encodeURIComponent(params.tz)}`,
							{ signal: params.signal },
						);
				setCache(key, value, ttlMs);
				return value;
			});
		},

		async getCalendarEvents(params: {
			from: string;
			to: string;
			lockerId?: number | null;
			compartmentId?: number | null;
			productId?: number | null;
			scope?: string | null;
			signal?: AbortSignal;
			ttlMs?: number;
		}): Promise<CalendarEvent[]> {
			const ttlMs = params.ttlMs ?? 20_000;
			const key = `events:${params.from}:${params.to}:l=${params.lockerId ?? ""}:c=${params.compartmentId ?? ""}:p=${
				params.productId ?? ""
			}:s=${params.scope ?? ""}`;
			const cached = getCache<CalendarEvent[]>(key);
			if (cached) return cached;
			return await getOrSetInflight(key, async () => {
				const value = useMock
					? mockEvents(params.from, params.to, params.lockerId)
					: await fetchJson<CalendarEvent[]>(
							`${baseUrl}/api/calendar/events?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(
								params.to,
							)}${params.scope ? `&scope=${encodeURIComponent(params.scope)}` : ""}${
								params.lockerId ? `&locker_id=${params.lockerId}` : ""
							}${params.compartmentId ? `&compartment_id=${params.compartmentId}` : ""}${
								params.productId ? `&product_id=${params.productId}` : ""
							}`,
							{ signal: params.signal },
						);
				setCache(key, value, ttlMs);
				return value;
			});
		},

		async createBlock(params: {
			target: "locker" | "compartment";
			lockerId?: number | null;
			compartmentId?: number | null;
			startAt: string;
			endAt: string;
			reason: string;
		}): Promise<CalendarEvent> {
			if (useMock) {
				return {
					id: String(Math.random()).slice(2),
					scope: "maintenance",
					status: "active",
					title: `Maintenance: ${params.reason}`,
					start_at: params.startAt,
					end_at: params.endAt,
					locker_id: params.lockerId ?? null,
					compartment_id: params.compartmentId ?? null,
					meta: { reason: params.reason },
				};
			}
			return await fetchJson<CalendarEvent>(`${baseUrl}/api/admin/calendar/blocks`, {
				method: "POST",
				body: JSON.stringify({
					scope: params.target,
					locker_id: params.lockerId ?? null,
					compartment_id: params.compartmentId ?? null,
					start_at: params.startAt,
					end_at: params.endAt,
					reason: params.reason,
				}),
			});
		},

		async deleteBlock(params: { id: number | string }): Promise<void> {
			if (useMock) return;
			const res = await fetch(`${baseUrl}/api/admin/calendar/blocks/${params.id}`, { method: "DELETE" });
			if (!res.ok) throw await readError(res);
		},

		// purely client-side filter helpers for admin UI
		filterEventsLocal(events: CalendarEvent[], filters: AdminFilters): CalendarEvent[] {
			const text = (filters.search ?? "").trim().toLowerCase();
			return events.filter((e) => {
				if (filters.scopes.size > 0 && !filters.scopes.has(e.scope)) return false;
				if (e.scope === "booking" && filters.statuses.size > 0 && !filters.statuses.has(e.status)) return false;
				if (filters.productId && Number(e.product_id ?? (e.meta as any)?.product_id) !== filters.productId) return false;
				if (!text) return true;
				const hay = `${e.id} ${e.title} ${JSON.stringify(e.meta ?? {})}`.toLowerCase();
				return hay.includes(text);
			});
		},
	};
}

