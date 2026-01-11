import * as React from "react";
import type { AvailabilityResponse, ISODateTime, TimeZone } from "../types";
import { createRentboxApiClient, type ApiClientOptions } from "../api";

export interface UseAvailabilityArgs extends ApiClientOptions {
	productId: number;
	startAt: ISODateTime;
	endAt: ISODateTime;
	tz: TimeZone;
	enabled?: boolean;
	ttlMs?: number;
}

export function useAvailability(args: UseAvailabilityArgs) {
	const enabled = args.enabled ?? true;
	const api = React.useMemo(
		() => createRentboxApiClient({ baseUrl: args.baseUrl, useMock: args.useMock }),
		[args.baseUrl, args.useMock],
	);

	const [data, setData] = React.useState<AvailabilityResponse | null>(null);
	const [error, setError] = React.useState<unknown>(null);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		if (!enabled) return;
		const ac = new AbortController();
		setIsLoading(true);
		setError(null);
		api
			.getAvailability({
				productId: args.productId,
				startAt: args.startAt,
				endAt: args.endAt,
				tz: args.tz,
				signal: ac.signal,
				ttlMs: args.ttlMs,
			})
			.then((v) => setData(v))
			.catch((e) => {
				if ((e as any)?.name === "AbortError") return;
				setError(e);
			})
			.finally(() => setIsLoading(false));
		return () => ac.abort();
	}, [api, enabled, args.productId, args.startAt, args.endAt, args.tz, args.ttlMs]);

	return { availability: data, isLoading, error };
}

