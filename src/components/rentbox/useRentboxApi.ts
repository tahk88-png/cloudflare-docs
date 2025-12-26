import { useState, useEffect, useCallback } from "react";
import type {
  DashboardData,
  Rental,
  Invoice,
  ApiResponse,
  BookingsResponse,
  InvoicesResponse,
  DashboardResponse,
} from "./types";

interface UseRentboxApiOptions {
  baseUrl?: string;
  autoFetch?: boolean;
}

interface UseRentboxApiResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchBookings: () => Promise<Rental[]>;
  fetchInvoices: () => Promise<Invoice[]>;
}

/**
 * Custom hook for fetching data from the Rentbox.ee API
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useRentboxApi({
 *   baseUrl: '/api/me',
 *   autoFetch: true,
 * });
 * ```
 */
export function useRentboxApi({
  baseUrl = "/api/me",
  autoFetch = true,
}: UseRentboxApiOptions = {}): UseRentboxApiResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const handleApiError = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    return "An unexpected error occurred";
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/dashboard`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to view your dashboard");
        }
        if (response.status === 403) {
          throw new Error("You don't have permission to view this dashboard");
        }
        throw new Error(`Failed to load dashboard (${response.status})`);
      }

      const result: ApiResponse<DashboardResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Invalid response from server");
      }

      setData(result.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const fetchBookings = useCallback(async (): Promise<Rental[]> => {
    try {
      const response = await fetch(`${baseUrl}/bookings`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load bookings (${response.status})`);
      }

      const result: ApiResponse<BookingsResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Invalid response from server");
      }

      return result.data.rentals;
    } catch (err) {
      throw new Error(handleApiError(err));
    }
  }, [baseUrl]);

  const fetchInvoices = useCallback(async (): Promise<Invoice[]> => {
    try {
      const response = await fetch(`${baseUrl}/invoices`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load invoices (${response.status})`);
      }

      const result: ApiResponse<InvoicesResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Invalid response from server");
      }

      return result.data.invoices;
    } catch (err) {
      throw new Error(handleApiError(err));
    }
  }, [baseUrl]);

  useEffect(() => {
    if (autoFetch) {
      fetchDashboard();
    }
  }, [autoFetch, fetchDashboard]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboard,
    fetchBookings,
    fetchInvoices,
  };
}

export default useRentboxApi;
