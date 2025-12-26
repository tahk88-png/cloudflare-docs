import * as React from "react";
import type { ISODate, Slot, TimeZone } from "../types";
import { createRentboxApiClient, type ApiClientOptions } from "../api";
import { useDebouncedValue } from "./useDebouncedValue";

export interface UseProductSlotsArgs extends ApiClientOptions {
	productId: number;
	date: ISODate;
	stepMinutes: number;
	durationMinutes: number;
	tz: TimeZone;
	enabled?: boolean;
	debounceMs?: number;
	ttlMs?: number;
}

export function useProductSlots(args: UseProductSlotsArgs) {
	const enabled = args.enabled ?? true;
	const debounceMs = args.debounceMs ?? 250;
	const [refreshKey, setRefreshKey] = React.useState(0);

	const debounced = useDebouncedValue(
		{
			productId: args.productId,
			date: args.date,
			stepMinutes: args.stepMinutes,
			durationMinutes: args.durationMinutes,
			tz: args.tz,
		},
		debounceMs,
	);

	const api = React.useMemo(
		() => createRentboxApiClient({ baseUrl: args.baseUrl, useMock: args.useMock }),
		[args.baseUrl, args.useMock],
	);

	const [data, setData] = React.useState<Slot[] | null>(null);
	const [error, setError] = React.useState<unknown>(null);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		if (!enabled) return;
		const ac = new AbortController();
		setIsLoading(true);
		setError(null);

		api
			.getProductSlots({
				productId: debounced.productId,
				date: debounced.date,
				stepMinutes: debounced.stepMinutes,
				durationMinutes: debounced.durationMinutes,
				tz: debounced.tz,
				signal: ac.signal,
				ttlMs: args.ttlMs,
			})
			.then((slots) => setData(slots))
			.catch((e) => {
				if ((e as any)?.name === "AbortError") return;
				setError(e);
			})
			.finally(() => setIsLoading(false));

		return () => ac.abort();
	}, [api, enabled, debounced, args.ttlMs, refreshKey]);

	return {
		slots: data,
		isLoading,
		error,
		refetch: () => setRefreshKey((x) => x + 1),
	};
}

