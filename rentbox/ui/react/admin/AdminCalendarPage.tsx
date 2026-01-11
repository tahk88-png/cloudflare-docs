import * as React from "react";
import type { AdminFilters, CalendarEvent, CompartmentOption, ISODate, LockerOption, ProductOption, TimeZone } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { createRentboxApiClient } from "../api";
import { dayRangeToISO, todayInTz, weekRangeToISO } from "../time";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { AdminCalendarToolbar, type AdminView } from "./AdminCalendarToolbar";
import { FiltersPanel } from "./FiltersPanel";
import { LockerSelect } from "./LockerSelect";
import { TimelineGrid } from "./TimelineGrid";
import { EventDrawer } from "./EventDrawer";
import { BlockCreateDialog } from "./BlockCreateDialog";
import { SkeletonTimeline } from "./SkeletonTimeline";
import { CalendarLegend } from "../components/CalendarLegend";

export interface AdminCalendarPageProps {
	lockers: LockerOption[];
	compartments: CompartmentOption[];
	products?: ProductOption[];
	baseUrl?: string;
	useMock?: boolean;
	tz?: TimeZone; // default Europe/Tallinn; locker timezone can override externally if needed
}

export function AdminCalendarPage({ lockers, compartments, products, baseUrl, useMock, tz = "Europe/Tallinn" }: AdminCalendarPageProps) {
	const api = React.useMemo(() => createRentboxApiClient({ baseUrl, useMock }), [baseUrl, useMock]);

	const [lockerId, setLockerId] = React.useState<number>(() => lockers[0]?.id ?? 0);
	const [date, setDate] = React.useState<ISODate>(() => todayInTz(tz));
	const [view, setView] = React.useState<AdminView>("day");
	const [startHour, setStartHour] = React.useState(8);
	const [endHour, setEndHour] = React.useState(22);

	const [filters, setFilters] = React.useState<AdminFilters>(() => ({
		statuses: new Set(["pending", "paid", "active", "overdue"]),
		scopes: new Set(["booking", "maintenance", "block"]),
		productId: null,
		search: "",
	}));

	const debouncedFilters = useDebouncedValue(filters, 250);

	// Visible range for fetch
	const range = React.useMemo(() => (view === "week" ? weekRangeToISO(date, tz) : dayRangeToISO(date, tz)), [view, date, tz]);

	// Poll (kept calm)
	const [pollTick, setPollTick] = React.useState(0);
	React.useEffect(() => {
		const t = setInterval(() => setPollTick((x) => x + 1), 45_000);
		return () => clearInterval(t);
	}, []);

	const { events, isLoading, error } = useCalendarEvents({
		from: range.from,
		to: range.to,
		lockerId,
		baseUrl,
		useMock,
		ttlMs: 20_000,
		refreshKey: pollTick,
	});

	const lockerCompartments = React.useMemo(
		() => compartments.filter((c) => c.locker_id === lockerId),
		[compartments, lockerId],
	);

	const filtered = React.useMemo(() => {
		if (!events) return null;
		return api.filterEventsLocal(events, debouncedFilters);
	}, [events, api, debouncedFilters]);

	// Drawer + dialog state
	const [drawerOpen, setDrawerOpen] = React.useState(false);
	const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(null);

	const [blockDialogOpen, setBlockDialogOpen] = React.useState(false);
	const [pendingBlock, setPendingBlock] = React.useState<{
		compartmentId: number;
		startAt: string;
		endAt: string;
	} | null>(null);

	const [mutateTick, setMutateTick] = React.useState(0);

	const openEvent = (e: CalendarEvent) => {
		setActiveEvent(e);
		setDrawerOpen(true);
	};

	const timezoneWarning =
		tz !== "Europe/Tallinn" ? (
			<Alert>
				<AlertTitle>Ajakava kuvame Eesti ajas.</AlertTitle>
				<AlertDescription>Operatiivkalender on nõuandev; server on tõeallikas.</AlertDescription>
			</Alert>
		) : null;

	return (
		<div className="space-y-3">
			{timezoneWarning}

			<Card>
				<CardHeader className="space-y-3">
					<CardTitle>Operatiivkalender</CardTitle>
					<AdminCalendarToolbar
						date={date}
						onDateChange={setDate}
						view={view}
						onViewChange={setView}
						startHour={startHour}
						endHour={endHour}
						onTimeWindowChange={({ startHour: s, endHour: e }) => {
							setStartHour(Math.max(0, Math.min(23, s)));
							setEndHour(Math.max(1, Math.min(24, e)));
						}}
						tz={tz}
					/>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
						{/* Sidebar */}
						<div className="space-y-3">
							<LockerSelect lockers={lockers} value={lockerId} onChange={setLockerId} />
							<FiltersPanel filters={filters} onChange={setFilters} products={products} />
							<CalendarLegend />
							<div className="text-xs text-gray-600">
								- Lohista ajajoonel, et luua hooldusblokk (15-min samm).
								<br />- Overdue on esile tõstetud.
							</div>
						</div>

						{/* Main */}
						<div className="space-y-3">
							{error ? (
								<Alert variant="destructive">
									<AlertTitle>Ei õnnestunud kalendrit laadida.</AlertTitle>
									<AlertDescription>Kontrolli ühendust ja proovi uuesti.</AlertDescription>
								</Alert>
							) : null}

							{(isLoading && !events) || !filtered ? (
								<SkeletonTimeline />
							) : filtered.length === 0 ? (
								<Alert>
									<AlertTitle>Selles vaates pole sündmusi.</AlertTitle>
									<AlertDescription>Muuda filtreid või vali teine kuupäev.</AlertDescription>
								</Alert>
							) : (
								<TimelineGrid
									date={date}
									tz={tz}
									compartments={lockerCompartments}
									events={filtered}
									startHour={startHour}
									endHour={endHour}
									onEventClick={openEvent}
									onCreateBlockDrag={({ compartmentId, startAt, endAt }) => {
										setPendingBlock({ compartmentId, startAt, endAt });
										setBlockDialogOpen(true);
									}}
									key={mutateTick /* simple refresh of internal layout state */}
								/>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<EventDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				event={activeEvent}
				tz={tz}
				onDeleteBlock={async (id) => {
					await api.deleteBlock({ id });
					setMutateTick((x) => x + 1);
					setPollTick((x) => x + 1);
				}}
			/>

			<BlockCreateDialog
				open={blockDialogOpen}
				onOpenChange={setBlockDialogOpen}
				startAt={pendingBlock?.startAt ?? null}
				endAt={pendingBlock?.endAt ?? null}
				target={{ lockerId, compartmentId: pendingBlock?.compartmentId ?? null }}
				tz={tz}
				onConfirm={async ({ reason }) => {
					if (!pendingBlock) return;
					await api.createBlock({
						target: "compartment",
						lockerId,
						compartmentId: pendingBlock.compartmentId,
						startAt: pendingBlock.startAt,
						endAt: pendingBlock.endAt,
						reason,
					});
					setMutateTick((x) => x + 1);
					setPollTick((x) => x + 1);
				}}
			/>
		</div>
	);
}

