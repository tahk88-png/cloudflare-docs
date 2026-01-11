import * as React from "react";
import type { CalendarEvent } from "../types";
import { createRentboxApiClient, type ApiClientOptions } from "../api";

export interface UseCalendarEventsArgs extends ApiClientOptions {
	from: string;
	to: string;
	lockerId?: number | null;
	compartmentId?: number | null;
	productId?: number | null;
	scope?: string | null;
	enabled?: boolean;
	ttlMs?: number;
	refreshKey?: number | string;
}

export function useCalendarEvents(args: UseCalendarEventsArgs) {
	const enabled = args.enabled ?? true;
	const api = React.useMemo(
		() => createRentboxApiClient({ baseUrl: args.baseUrl, useMock: args.useMock }),
		[args.baseUrl, args.useMock],
	);

	const [events, setEvents] = React.useState<CalendarEvent[] | null>(null);
	const [error, setError] = React.useState<unknown>(null);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		if (!enabled) return;
		const ac = new AbortController();
		setIsLoading(true);
		setError(null);
		api
			.getCalendarEvents({
				from: args.from,
				to: args.to,
				lockerId: args.lockerId,
				compartmentId: args.compartmentId,
				productId: args.productId,
				scope: args.scope,
				signal: ac.signal,
				ttlMs: args.ttlMs,
			})
			.then((v) => setEvents(v))
			.catch((e) => {
				if ((e as any)?.name === "AbortError") return;
				setError(e);
			})
			.finally(() => setIsLoading(false));
		return () => ac.abort();
	}, [
		api,
		enabled,
		args.from,
		args.to,
		args.lockerId,
		args.compartmentId,
		args.productId,
		args.scope,
		args.ttlMs,
		args.refreshKey,
	]);

	return { events, isLoading, error };
}

