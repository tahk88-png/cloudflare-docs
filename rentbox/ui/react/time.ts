import type { ISODate, ISODateTime, TimeZone } from "./types";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function assertTallinnTz(tz: string | undefined): asserts tz is TimeZone {
	// We allow custom tz, but the UI should communicate Tallinn as the truth.
	if (!tz) return;
}

export function formatISOToTime(iso: ISODateTime, tz: TimeZone): string {
	const d = new Date(iso);
	const parts = new Intl.DateTimeFormat("et-EE", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(d);
	const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
	const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
	return `${hh}:${mm}`;
}

export function formatISOToDayLabel(iso: ISODateTime, tz: TimeZone): string {
	const d = new Date(iso);
	return new Intl.DateTimeFormat("et-EE", {
		timeZone: tz,
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
	}).format(d);
}

export function formatISOToFull(iso: ISODateTime, tz: TimeZone): string {
	const d = new Date(iso);
	return new Intl.DateTimeFormat("et-EE", {
		timeZone: tz,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(d);
}

export function todayInTz(tz: TimeZone): ISODate {
	const now = new Date();
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const y = parts.find((p) => p.type === "year")?.value ?? "1970";
	const m = parts.find((p) => p.type === "month")?.value ?? "01";
	const d = parts.find((p) => p.type === "day")?.value ?? "01";
	return `${y}-${m}-${d}`;
}

export function addDaysISODate(date: ISODate, days: number): ISODate {
	// Treat as UTC date for arithmetic; only used for stepping UI days.
	const [y, m, d] = date.split("-").map((x) => Number(x));
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + days);
	return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function getZonedParts(date: Date, tz: TimeZone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
	return {
		year: get("year"),
		month: get("month"),
		day: get("day"),
		hour: get("hour"),
		minute: get("minute"),
		second: get("second"),
	};
}

function minutesBetweenWallTimes(a: ReturnType<typeof getZonedParts>, b: ReturnType<typeof getZonedParts>) {
	const aUtc = Date.UTC(a.year, a.month - 1, a.day, a.hour, a.minute, 0);
	const bUtc = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, 0);
	return Math.round((bUtc - aUtc) / 60000);
}

/**
 * Convert a "wall clock" time in a timezone into a real Date (UTC instant),
 * without external deps. Uses a small iterative correction, DST-safe.
 */
export function zonedWallTimeToDate(
	input: { date: ISODate; hour: number; minute: number; tz: TimeZone },
): Date {
	const [y, m, d] = input.date.split("-").map((x) => Number(x));
	// Initial guess: interpret requested wall time as UTC.
	let guess = new Date(Date.UTC(y, m - 1, d, input.hour, input.minute, 0));

	for (let i = 0; i < 3; i++) {
		const got = getZonedParts(guess, input.tz);
		const want = { year: y, month: m, day: d, hour: input.hour, minute: input.minute, second: 0 };
		const deltaMin = minutesBetweenWallTimes(got, want);
		if (deltaMin === 0) break;
		guess = new Date(guess.getTime() + deltaMin * 60000);
	}

	return guess;
}

export function dayRangeToISO(date: ISODate, tz: TimeZone): { from: ISODateTime; to: ISODateTime } {
	const from = zonedWallTimeToDate({ date, hour: 0, minute: 0, tz }).toISOString();
	const next = addDaysISODate(date, 1);
	const to = zonedWallTimeToDate({ date: next, hour: 0, minute: 0, tz }).toISOString();
	return { from, to };
}

export function weekRangeToISO(date: ISODate, tz: TimeZone): { from: ISODateTime; to: ISODateTime } {
	// Week starts Monday (ISO-8601).
	const [y, m, d] = date.split("-").map((x) => Number(x));
	const utc = new Date(Date.UTC(y, m - 1, d));
	const day = utc.getUTCDay(); // 0..6 (Sun..Sat)
	const isoDow = day === 0 ? 7 : day; // 1..7
	const monday = new Date(Date.UTC(y, m - 1, d));
	monday.setUTCDate(monday.getUTCDate() - (isoDow - 1));
	const start: ISODate = `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
	const end: ISODate = addDaysISODate(start, 7);
	return {
		from: zonedWallTimeToDate({ date: start, hour: 0, minute: 0, tz }).toISOString(),
		to: zonedWallTimeToDate({ date: end, hour: 0, minute: 0, tz }).toISOString(),
	};
}

export function nowInTzMinutes(tz: TimeZone): { date: ISODate; minutes: number } {
	const now = new Date();
	const p = getZonedParts(now, tz);
	const date: ISODate = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
	return { date, minutes: p.hour * 60 + p.minute };
}
