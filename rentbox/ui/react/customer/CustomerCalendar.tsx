import * as React from "react";
import type { ISODate, Slot, TimeZone } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { addDaysISODate, nowInTzMinutes, todayInTz, zonedWallTimeToDate } from "../time";
import { CalendarToolbar } from "./CalendarToolbar";
import { SlotGrid } from "./SlotGrid";
import { SelectedRangeSummary } from "./SelectedRangeSummary";
import { NextAvailableBanner } from "./NextAvailableBanner";
import { useProductSlots } from "../hooks/useProductSlots";
import { useAvailability } from "../hooks/useAvailability";
import { createRentboxApiClient } from "../api";
import { CalendarLegend } from "../components/CalendarLegend";

export interface CustomerCalendarProps {
	productId: number;
	tz?: TimeZone; // default Europe/Tallinn
	baseUrl?: string;
	useMock?: boolean;
	onSelectRange?: (slot: Slot | null) => void;
	prefetchNextDay?: boolean;
}

export function CustomerCalendar({
	productId,
	tz = "Europe/Tallinn",
	baseUrl,
	useMock,
	onSelectRange,
	prefetchNextDay = true,
}: CustomerCalendarProps) {
	const [date, setDate] = React.useState<ISODate>(() => todayInTz(tz));
	const [durationMinutes, setDurationMinutes] = React.useState<number>(120);
	const [stepMinutes, setStepMinutes] = React.useState<number>(30);
	const [selected, setSelected] = React.useState<Slot | null>(null);

	// Load slots
	const { slots, isLoading, error, refetch } = useProductSlots({
		productId,
		date,
		stepMinutes,
		durationMinutes,
		tz,
		baseUrl,
		useMock,
		debounceMs: 250,
		ttlMs: 45_000,
	});

	// Optional performance: prefetch next day into cache.
	React.useEffect(() => {
		if (!prefetchNextDay) return;
		const api = createRentboxApiClient({ baseUrl, useMock });
		const next = addDaysISODate(date, 1);
		api.getProductSlots({
			productId,
			date: next,
			stepMinutes,
			durationMinutes,
			tz,
			ttlMs: 45_000,
		}).catch(() => {
			// best-effort prefetch
		});
	}, [prefetchNextDay, baseUrl, useMock, productId, date, stepMinutes, durationMinutes, tz]);

	// Keep selection valid when slots refresh
	React.useEffect(() => {
		if (!slots) return;
		if (!selected) return;
		const stillThere = slots.find((s) => s.start_at === selected.start_at);
		if (!stillThere) setSelected(null);
	}, [slots, selected]);

	React.useEffect(() => {
		onSelectRange?.(selected);
	}, [selected, onSelectRange]);

	// If day has no available slots, show "next available" from now (for this duration).
	const anyAvailable = Boolean(slots?.some((s) => s.is_available));

	const { date: todayDate, minutes: nowMinutes } = nowInTzMinutes(tz);
	const startForNext = React.useMemo(() => {
		// Use "now in Tallinn rounded up to step" as the availability search start.
		const rounded = Math.ceil(nowMinutes / stepMinutes) * stepMinutes;
		const hour = Math.floor(rounded / 60);
		const minute = rounded % 60;
		const d = date >= todayDate ? date : todayDate;
		return zonedWallTimeToDate({ date: d, hour, minute, tz }).toISOString();
	}, [date, todayDate, nowMinutes, stepMinutes, tz]);

	const endForNext = React.useMemo(() => new Date(new Date(startForNext).getTime() + durationMinutes * 60_000).toISOString(), [
		startForNext,
		durationMinutes,
	]);

	const availability = useAvailability({
		productId,
		startAt: startForNext,
		endAt: endForNext,
		tz,
		baseUrl,
		useMock,
		enabled: Boolean(!anyAvailable),
		ttlMs: 30_000,
	});

	const jumpToNextAvailable = React.useCallback(() => {
		const next = availability.availability?.next_available_at;
		if (!next) return;
		// Convert next ISO to Tallinn local date label via formatter trick:
		const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
			new Date(next),
		);
		const y = parts.find((p) => p.type === "year")?.value ?? "1970";
		const m = parts.find((p) => p.type === "month")?.value ?? "01";
		const d = parts.find((p) => p.type === "day")?.value ?? "01";
		setDate(`${y}-${m}-${d}` as ISODate);
		setSelected({ start_at: next, end_at: new Date(new Date(next).getTime() + durationMinutes * 60_000).toISOString(), is_available: true });
	}, [availability.availability?.next_available_at, durationMinutes, tz]);

	const timezoneWarning =
		tz !== "Europe/Tallinn" ? (
			<Alert>
				<AlertTitle>Ajakava kuvame Eesti ajas.</AlertTitle>
				<AlertDescription>Server kinnitab alati tegeliku saadavuse.</AlertDescription>
			</Alert>
		) : null;

	return (
		<div className="space-y-3">
			{timezoneWarning}

			<Card>
				<CardHeader>
					<CardTitle>Vali rendiaeg</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<CalendarToolbar
						date={date}
						onDateChange={(d) => {
							setDate(d);
							setSelected(null);
						}}
						durationMinutes={durationMinutes}
						onDurationChange={(m) => {
							setDurationMinutes(m);
							setSelected(null);
						}}
						stepMinutes={stepMinutes}
						onStepChange={(m) => {
							setStepMinutes(m);
							setSelected(null);
						}}
						tz={tz}
					/>

					<details className="rounded-lg border border-gray-200 bg-white p-3">
						<summary className="cursor-pointer text-sm font-medium text-gray-900">Selgitused</summary>
						<div className="mt-2">
							<CalendarLegend variant="customer" />
						</div>
					</details>

					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Ei õnnestunud aegu laadida.</AlertTitle>
							<AlertDescription>Palun proovi uuesti.</AlertDescription>
							<div className="mt-3">
								<Button variant="outline" size="sm" onClick={() => refetch()}>
									Uuenda
								</Button>
							</div>
						</Alert>
					) : null}

					{slots && !anyAvailable ? (
						<NextAvailableBanner
							nextAvailableAt={availability.availability?.next_available_at ?? null}
							onJump={jumpToNextAvailable}
							tz={tz}
						/>
					) : null}

					<SlotGrid
						slots={slots}
						isLoading={isLoading}
						selectedStartAt={selected?.start_at ?? null}
						onSelect={(slot) => setSelected(slot)}
						tz={tz}
					/>
				</CardContent>
			</Card>

			<div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-0 py-2">
					<SelectedRangeSummary selected={selected} tz={tz} />
				</div>
			</div>
		</div>
	);
}

