const API_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // System
  getHealth: () => fetchAPI('/api/system/health'),
  getFlags: () => fetchAPI('/api/system/flags'),

  // Products
  getProducts: () => fetchAPI('/api/products'),
  getProduct: (slug: string) => fetchAPI(`/api/products/${slug}`),
  getSlots: (productId: string, params: { date: string; step_minutes?: number; duration_minutes?: number; tz?: string }) => {
    const searchParams = new URLSearchParams({
      date: params.date,
      step_minutes: String(params.step_minutes || 60),
      duration_minutes: String(params.duration_minutes || 240),
      tz: params.tz || 'Europe/Tallinn',
    });
    return fetchAPI(`/api/products/${productId}/slots?${searchParams}`);
  },

  // Cart
  getCart: (cartId: string) => fetchAPI(`/api/cart/${cartId}`),
  addToCart: (data: { cartId: string; productId: string; compartmentId: string; startAt: string; endAt: string }) =>
    fetchAPI('/api/cart/add', { method: 'POST', body: JSON.stringify(data) }),

  // Checkout
  applyCode: (code: string) => fetchAPI('/api/checkout/apply-code', { method: 'POST', body: JSON.stringify({ code }) }),
  removeCode: (code: string) => fetchAPI('/api/checkout/remove-code', { method: 'POST', body: JSON.stringify({ code }) }),

  // Bookings
  quoteBooking: (data: { productId: string; compartmentId: string; startAt: string; endAt: string }) =>
    fetchAPI('/api/bookings/quote', { method: 'POST', body: JSON.stringify(data) }),
  createBooking: (data: { productId: string; compartmentId: string; startAt: string; endAt: string }) =>
    fetchAPI('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: string) => fetchAPI(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  extendBooking: (id: string, endAt: string) =>
    fetchAPI(`/api/bookings/${id}/extend`, { method: 'POST', body: JSON.stringify({ endAt }) }),

  // Admin
  getAdminBookings: (token: string) =>
    fetchAPI('/api/admin/bookings', { headers: { 'x-admin-token': token } }),
  getAdminIncidents: (token: string) =>
    fetchAPI('/api/admin/incidents', { headers: { 'x-admin-token': token } }),
  resolveIncident: (id: string, token: string) =>
    fetchAPI(`/api/admin/incidents/${id}/resolve`, { method: 'POST', headers: { 'x-admin-token': token } }),
  loadDemo: (token: string) =>
    fetchAPI('/api/admin/demo/load', { method: 'POST', headers: { 'x-admin-token': token } }),
  resetDemo: (token: string) =>
    fetchAPI('/api/admin/demo/reset', { method: 'POST', headers: { 'x-admin-token': token } }),
};
