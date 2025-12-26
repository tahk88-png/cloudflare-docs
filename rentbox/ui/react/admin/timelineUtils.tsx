import type { CalendarEvent, TimeZone } from "../types";

export function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function zonedMinutesFromISO(iso: string, tz: TimeZone): number {
	const d = new Date(iso);
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(d);
	const hh = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
	const mm = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
	return hh * 60 + mm;
}

export interface PositionedEvent {
	event: CalendarEvent;
	topLane: number;
	lanes: number;
	leftPx: number;
	widthPx: number;
}

/**
 * Assigns events into lanes to avoid overlap within a single resource row.
 * This is a classic interval partitioning approach.
 */
export function layoutEventsForRow(params: {
	events: CalendarEvent[];
	tz: TimeZone;
	startMinute: number;
	endMinute: number;
	pxPerMinute: number;
	snapMinutes?: number;
}): PositionedEvent[] {
	const snap = params.snapMinutes ?? 15;

	const items = params.events
		.slice()
		.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

	type Lane = { endMinute: number };
	const lanes: Lane[] = [];
	const positioned: PositionedEvent[] = [];

	for (const ev of items) {
		const rawStart = zonedMinutesFromISO(ev.start_at, params.tz);
		const rawEnd = zonedMinutesFromISO(ev.end_at, params.tz);
		const start = Math.floor(rawStart / snap) * snap;
		const end = Math.ceil(rawEnd / snap) * snap;

		const clippedStart = clamp(start, params.startMinute, params.endMinute);
		const clippedEnd = clamp(end, params.startMinute, params.endMinute);
		if (clippedEnd <= clippedStart) continue;

		let laneIndex = lanes.findIndex((l) => l.endMinute <= clippedStart);
		if (laneIndex === -1) {
			laneIndex = lanes.length;
			lanes.push({ endMinute: clippedEnd });
		} else {
			lanes[laneIndex].endMinute = clippedEnd;
		}

		const leftPx = (clippedStart - params.startMinute) * params.pxPerMinute;
		const widthPx = (clippedEnd - clippedStart) * params.pxPerMinute;
		positioned.push({ event: ev, topLane: laneIndex, lanes: 0, leftPx, widthPx });
	}

	// set total lanes for each
	for (const p of positioned) p.lanes = Math.max(1, lanes.length);
	return positioned;
}

