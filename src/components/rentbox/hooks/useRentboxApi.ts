import { useState, useEffect, useCallback } from "react";
import type {
	UserDashboardData,
	BookingsResponse,
	InvoicesResponse,
	ApiResponse,
} from "../types";

const API_BASE_URL = "/api/me";

interface UseApiState<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
}

async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
	try {
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();
		return { data };
	} catch (error) {
		return {
			data: null as unknown as T,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

export function useDashboard() {
	const [state, setState] = useState<UseApiState<UserDashboardData>>({
		data: null,
		loading: true,
		error: null,
	});

	useEffect(() => {
		async function loadDashboard() {
			setState((prev) => ({ ...prev, loading: true }));
			const result = await fetchApi<UserDashboardData>("/dashboard");

			if (result.error) {
				setState({ data: null, loading: false, error: result.error });
			} else {
				setState({ data: result.data, loading: false, error: null });
			}
		}

		loadDashboard();
	}, []);

	return state;
}

export function useBookings() {
	const [state, setState] = useState<UseApiState<BookingsResponse>>({
		data: null,
		loading: true,
		error: null,
	});

	const refetch = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true }));
		const result = await fetchApi<BookingsResponse>("/bookings");

		if (result.error) {
			setState({ data: null, loading: false, error: result.error });
		} else {
			setState({ data: result.data, loading: false, error: null });
		}
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	return { ...state, refetch };
}

export function useInvoices() {
	const [state, setState] = useState<UseApiState<InvoicesResponse>>({
		data: null,
		loading: true,
		error: null,
	});

	useEffect(() => {
		async function loadInvoices() {
			setState((prev) => ({ ...prev, loading: true }));
			const result = await fetchApi<InvoicesResponse>("/invoices");

			if (result.error) {
				setState({ data: null, loading: false, error: result.error });
			} else {
				setState({ data: result.data, loading: false, error: null });
			}
		}

		loadInvoices();
	}, []);

	return state;
}

// Action to rent again
export async function rentAgain(
	rentalId: string,
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
	try {
		const response = await fetch(`${API_BASE_URL}/bookings/${rentalId}/rerent`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error("Failed to create new rental");
		}

		const data = await response.json();
		return { success: true, redirectUrl: data.redirectUrl };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
