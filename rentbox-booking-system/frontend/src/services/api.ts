// ═══════════════════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Cart,
  ValidationResult,
  CheckoutResponse,
  PaymentConfirmationResponse,
  Booking,
  ExtendBookingResponse,
  ApiResponse,
} from '../types';

const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'An error occurred');
  }

  return data.data as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// CART API
// ═══════════════════════════════════════════════════════════════════════════

export const cartApi = {
  create: (data?: { user_id?: string; session_id?: string }): Promise<Cart> =>
    request('/cart', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  get: (cartId: string): Promise<Cart> =>
    request(`/cart/${cartId}`),

  addItem: (
    cartId: string,
    data: { product_id: string; start_at: string; end_at: string }
  ): Promise<Cart> =>
    request(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (
    cartId: string,
    itemId: string,
    data: { start_at?: string; end_at?: string }
  ): Promise<Cart> =>
    request(`/cart/${cartId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeItem: (cartId: string, itemId: string): Promise<Cart> =>
    request(`/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  validate: (cartId: string): Promise<ValidationResult> =>
    request(`/cart/${cartId}/validate`, {
      method: 'POST',
    }),
};

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT API
// ═══════════════════════════════════════════════════════════════════════════

export const checkoutApi = {
  initiate: (
    cartId: string,
    data: { return_url: string; customer_email?: string }
  ): Promise<CheckoutResponse> =>
    request(`/cart/${cartId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmPayment: (
    cartId: string,
    paymentIntentId: string
  ): Promise<PaymentConfirmationResponse> =>
    request(`/cart/${cartId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }),
};

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING API
// ═══════════════════════════════════════════════════════════════════════════

export const bookingApi = {
  get: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}`),

  getUserBookings: (userId: string, status?: string): Promise<Booking[]> => {
    const params = status ? `?status=${status}` : '';
    return request(`/bookings/user/${userId}${params}`);
  },

  getActiveBookings: (userId: string): Promise<Booking[]> =>
    request(`/bookings/user/${userId}/active`),

  markPickedUp: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}/pickup`, {
      method: 'POST',
    }),

  markReturned: (bookingId: string): Promise<Booking> =>
    request(`/bookings/${bookingId}/return`, {
      method: 'POST',
    }),

  cancel: (bookingId: string, reason?: string): Promise<Booking> =>
    request(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  extend: (
    bookingId: string,
    newEndAt: string
  ): Promise<ExtendBookingResponse> =>
    request(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ new_end_at: newEndAt }),
    }),

  confirmExtension: (
    bookingId: string,
    paymentIntentId: string
  ): Promise<ExtendBookingResponse> =>
    request(`/bookings/${bookingId}/confirm-extension`, {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }),
};
