import * as React from "react";
import type { CalendarEvent, CompartmentOption, ISODate, TimeZone } from "../types";
import { cn } from "../components/ui/cn";
import { nowInTzMinutes, zonedWallTimeToDate } from "../time";
import { layoutEventsForRow } from "./timelineUtils";
import { EventBlock } from "./EventBlock";
import { useVirtualRows } from "./useVirtualRows";

export interface TimelineGridProps {
	date: ISODate;
	tz: TimeZone;
	compartments: CompartmentOption[];
	events: CalendarEvent[];
	startHour: number;
	endHour: number;
	onEventClick: (e: CalendarEvent) => void;
	onCreateBlockDrag?: (args: { compartmentId: number; startAt: string; endAt: string }) => void;
}

function makeHourMarks(startHour: number, endHour: number): number[] {
	const out: number[] = [];
	for (let h = startHour; h <= endHour; h++) out.push(h);
	return out;
}

export function TimelineGrid({
	date,
	tz,
	compartments,
	events,
	startHour,
	endHour,
	onEventClick,
	onCreateBlockDrag,
}: TimelineGridProps) {
	const rowHeight = 44;
	const pxPerMinute = 1.2; // calm density; scroll horizontally if needed
	const startMinute = startHour * 60;
	const endMinute = endHour * 60;
	const minutesTotal = Math.max(60, endMinute - startMinute);
	const gridWidth = Math.round(minutesTotal * pxPerMinute);

	const hours = makeHourMarks(startHour, endHour);

	// Virtualize rows (helps once > ~20 compartments)
	const v = useVirtualRows({ count: compartments.length, rowHeight, overscan: 8 });

	// Now line (update per minute)
	const [nowTick, setNowTick] = React.useState(0);
	React.useEffect(() => {
		const t = setInterval(() => setNowTick((x) => x + 1), 30_000);
		return () => clearInterval(t);
	}, []);
	const now = React.useMemo(() => nowInTzMinutes(tz), [tz, nowTick]);
	const showNowLine = now.date === date && now.minutes >= startMinute && now.minutes <= endMinute;
	const nowLeft = (now.minutes - startMinute) * pxPerMinute;

	// Pre-index events for fast per-row rendering
	const indexed = React.useMemo(() => {
		const byCompartment = new Map<number, CalendarEvent[]>();
		const lockerLevel = new Map<number, CalendarEvent[]>();
		for (const e of events) {
			if (e.compartment_id != null) {
				const id = Number(e.compartment_id);
				const arr = byCompartment.get(id) ?? [];
				arr.push(e);
				byCompartment.set(id, arr);
			} else if (e.locker_id != null) {
				const lid = Number(e.locker_id);
				const arr = lockerLevel.get(lid) ?? [];
				arr.push(e);
				lockerLevel.set(lid, arr);
			}
		}
		return { byCompartment, lockerLevel };
	}, [events]);

	// Drag-create block state
	const drag = React.useRef<{
		active: boolean;
		compartmentId: number;
		startMin: number;
		endMin: number;
	} | null>(null);
	const [, force] = React.useState(0);

	function snap15(min: number) {
		return Math.round(min / 15) * 15;
	}

	function xToMinute(el: HTMLElement, clientX: number) {
		const rect = el.getBoundingClientRect();
		const x = clientX - rect.left;
		return snap15(startMinute + x / pxPerMinute);
	}

	function minutesToISO(min: number) {
		const hour = Math.floor(min / 60);
		const minute = min % 60;
		return zonedWallTimeToDate({ date, hour, minute, tz }).toISOString();
	}

	return (
		<div className="grid grid-cols-[14rem_1fr] gap-0 rounded-xl border border-gray-200 bg-white">
			{/* Left column header */}
			<div className="sticky top-0 z-20 border-b border-gray-200 bg-white p-3 text-sm font-medium text-gray-900">
				Kambrid
			</div>

			{/* Time axis header */}
			<div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
				<div className="overflow-x-auto">
					<div className="relative" style={{ width: gridWidth, height: 44 }}>
						{hours.map((h) => {
							const left = (h * 60 - startMinute) * pxPerMinute;
							return (
								<div key={h} className="absolute top-0 h-full border-l border-gray-200" style={{ left }}>
									<div className="px-2 pt-2 text-xs text-gray-600">{String(h).padStart(2, "0")}:00</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Body (shared vertical scroll for left+right) */}
			<div ref={v.containerRef} className="col-span-2 grid max-h-[70vh] grid-cols-[14rem_1fr] overflow-y-auto">
				{/* Resource list */}
				<div className="border-r border-gray-200">
					<div style={{ height: v.totalHeight }}>
						<div style={{ transform: `translateY(${v.offsetTop}px)` }}>
							{compartments.slice(v.startIndex, v.endIndex + 1).map((c) => (
								<div
									key={c.id}
									className={cn(
										"flex h-[44px] items-center border-b border-gray-100 px-3 text-sm",
										c.is_active === false ? "text-gray-400" : "text-gray-900",
									)}
								>
									<div className="font-medium">{c.code}</div>
									<div className="ml-2 text-xs text-gray-500">#{c.id}</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Timeline cells (horizontal scroll only) */}
				<div className="overflow-x-auto">
					<div className="relative" style={{ width: gridWidth, height: v.totalHeight }}>
						{/* grid lines */}
						{hours.map((h) => {
							const left = (h * 60 - startMinute) * pxPerMinute;
							return <div key={h} className="absolute top-0 h-full border-l border-gray-100" style={{ left }} />;
						})}

						{/* now line */}
						{showNowLine ? (
							<div className="absolute top-0 h-full w-px bg-red-500" style={{ left: nowLeft }} aria-label="Now" />
						) : null}

						{/* drag ghost */}
						{drag.current?.active ? (
							<div
								className="absolute z-30 rounded-md border border-amber-300 bg-amber-200/60"
								style={{
									left: (Math.min(drag.current.startMin, drag.current.endMin) - startMinute) * pxPerMinute,
									top: compartments.findIndex((x) => x.id === drag.current?.compartmentId) * rowHeight + 6,
									width: Math.abs(drag.current.endMin - drag.current.startMin) * pxPerMinute,
									height: rowHeight - 12,
								}}
							/>
						) : null}

						{/* visible rows only */}
						{compartments.slice(v.startIndex, v.endIndex + 1).map((c, localIdx) => {
								const idx = v.startIndex + localIdx;
								const top = idx * rowHeight;
								const rowEvents = [
									...(indexed.byCompartment.get(c.id) ?? []),
									...(indexed.lockerLevel.get(c.locker_id) ?? []),
								];
								const positioned = layoutEventsForRow({
									events: rowEvents,
									tz,
									startMinute,
									endMinute,
									pxPerMinute,
									snapMinutes: 15,
								});

								return (
									<div key={c.id} className="absolute left-0 right-0 border-b border-gray-100" style={{ top, height: rowHeight }}>
										<div
											className={cn("relative h-full", "cursor-crosshair")}
											onPointerDown={(e) => {
												if (!onCreateBlockDrag) return;
												if ((e as any).button !== undefined && (e as any).button !== 0) return;
												const el = e.currentTarget as HTMLElement;
												el.setPointerCapture(e.pointerId);
												const m = xToMinute(el, e.clientX);
												drag.current = { active: true, compartmentId: c.id, startMin: m, endMin: m + 30 };
												force((x) => x + 1);
											}}
											onPointerMove={(e) => {
												if (!drag.current?.active) return;
												const el = e.currentTarget as HTMLElement;
												const m = xToMinute(el, e.clientX);
												drag.current.endMin = m;
												force((x) => x + 1);
											}}
											onPointerUp={(e) => {
												if (!drag.current?.active) return;
												const el = e.currentTarget as HTMLElement;
												el.releasePointerCapture(e.pointerId);
												const a = drag.current.startMin;
												const b = drag.current.endMin;
												drag.current.active = false;
												force((x) => x + 1);
												const start = Math.min(a, b);
												const end = Math.max(a, b);
												if (end - start < 15) return;
												onCreateBlockDrag?.({
													compartmentId: c.id,
													startAt: minutesToISO(start),
													endAt: minutesToISO(end),
												});
											}}
										>
											{positioned.map((p) => (
												<EventBlock
													key={`${p.event.id}`}
													event={p.event}
													tz={tz}
													onClick={() => onEventClick(p.event)}
													lane={p.topLane}
													lanes={p.lanes}
													style={{
														left: p.leftPx,
														width: Math.max(8, p.widthPx),
													}}
												/>
											))}
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</div>
		</div>
	);
}

