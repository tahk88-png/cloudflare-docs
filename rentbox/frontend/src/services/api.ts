import { Cart, CartItem, Booking, ApiResponse, CartTotals } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error?.error || 'Request failed');
  }

  return data.data as T;
}

export const cartApi = {
  create: (userId?: string, sessionId?: string) =>
    fetchApi<Cart>('/cart', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, session_id: sessionId }),
    }),

  get: (cartId: string) =>
    fetchApi<{ cart: Cart; totals: CartTotals; items_count: number; expires_in_seconds: number }>(
      `/cart/${cartId}`
    ),

  addItem: (
    cartId: string,
    productId: string,
    startAt: string,
    endAt: string
  ) =>
    fetchApi<CartItem>(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        start_at: startAt,
        end_at: endAt,
      }),
    }),

  updateItem: (
    cartId: string,
    itemId: string,
    updates: { start_at?: string; end_at?: string }
  ) =>
    fetchApi<CartItem>(`/cart/${cartId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  removeItem: (cartId: string, itemId: string) =>
    fetchApi<{ message: string }>(`/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  validate: (cartId: string) =>
    fetchApi<{ valid: boolean; issues: Array<{ item_id: string; message: string }> }>(
      `/cart/${cartId}/validate`,
      { method: 'POST' }
    ),

  checkout: (cartId: string, returnUrl: string, cancelUrl: string, userEmail?: string) =>
    fetchApi<{ cart_id: string; payment_id: string; client_secret: string }>(
      `/cart/${cartId}/checkout`,
      {
        method: 'POST',
        body: JSON.stringify({
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_email: userEmail,
        }),
      }
    ),

  confirmPayment: (cartId: string, paymentIntentId: string) =>
    fetchApi<{ payment: any; message: string }>(
      `/cart/${cartId}/confirm-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      }
    ),
};

export const bookingsApi = {
  get: (bookingId: string) =>
    fetchApi<Booking>(`/bookings/${bookingId}`),

  getUserBookings: (userId: string, status?: string[]) => {
    const params = status ? `?status=${status.join(',')}` : '';
    return fetchApi<Booking[]>(`/bookings/user/${userId}${params}`);
  },

  extend: (bookingId: string, newEndAt: string, userEmail?: string) =>
    fetchApi<{
      booking: Booking;
      additional_payment: number;
      payment_required: boolean;
      client_secret?: string;
      payment_id?: string;
    }>(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ new_end_at: newEndAt, user_email: userEmail }),
    }),

  cancel: (bookingId: string, reason?: string) =>
    fetchApi<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  complete: (bookingId: string) =>
    fetchApi<Booking>(`/bookings/${bookingId}/complete`, {
      method: 'POST',
    }),
};

export const adminApi = {
  getCarts: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return fetchApi<any[]>(`/admin/carts${params}`);
  },

  getCart: (cartId: string) =>
    fetchApi<{ cart: Cart; locks: any[] }>(`/admin/carts/${cartId}`),

  recoverCart: (cartId: string) =>
    fetchApi<{ message: string }>(`/admin/carts/${cartId}/recover`, {
      method: 'POST',
    }),

  getBookings: (filters?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    compartment_id?: string;
  }) => {
    const params = new URLSearchParams(filters as any).toString();
    return fetchApi<Booking[]>(`/admin/bookings?${params}`);
  },

  getCompartmentTimeline: (
    compartmentId: string,
    fromDate?: string,
    toDate?: string
  ) => {
    const params = new URLSearchParams({
      ...(fromDate && { from_date: fromDate }),
      ...(toDate && { to_date: toDate }),
    }).toString();
    return fetchApi<Booking[]>(
      `/admin/bookings/timeline/${compartmentId}?${params}`
    );
  },

  forceRelease: (bookingId: string, reason?: string) =>
    fetchApi<Booking>(`/admin/bookings/${bookingId}/force-release`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getStats: () =>
    fetchApi<{
      active_carts: number;
      expired_carts: number;
      confirmed_bookings: number;
      active_bookings: number;
      completed_bookings: number;
      active_locks: number;
      successful_payments: number;
      total_revenue: number;
    }>('/admin/stats'),

  cleanup: () =>
    fetchApi<{ expired_carts: number; expired_locks: number }>(
      '/admin/cleanup',
      { method: 'POST' }
    ),
};
