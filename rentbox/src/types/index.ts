export interface Product {
  id: string;
  name: string;
  description?: string;
  base_price_per_hour: number;
}

export interface Compartment {
  id: string;
  product_id: string;
  locker_number: string;
  status: 'available' | 'maintenance';
}

export interface Cart {
  id: string;
  user_id?: string;
  status: 'active' | 'locked' | 'converted' | 'abandoned';
  expires_at: string; // ISO date
  created_at: string;
  items: CartItem[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  start_at: string; // ISO date
  end_at: string; // ISO date
  price: number;
  deposit: number;
  product?: Product; // Joined
}

export interface CartLock {
  id: string;
  cart_id: string;
  product_id: string;
  compartment_id: string;
  start_at: string;
  end_at: string;
  expires_at: string;
}

export interface Booking {
  id: string;
  user_id?: string;
  product_id: string;
  compartment_id: string;
  start_at: string;
  end_at: string;
  status: 'confirmed' | 'active' | 'completed' | 'cancelled';
  total_price: number;
  created_at: string;
}

export interface PricingBreakdown {
  base_price: number;
  duration_hours: number;
  peak_multiplier: number;
  weekend_multiplier: number;
  long_rental_discount: number;
  deposit: number;
  total: number;
}

export interface AvailabilityRequest {
  product_id: string;
  start_at: string;
  end_at: string;
}

export interface AvailabilityResponse {
  available: boolean;
  compartment_id?: string; // If reserved/checked
  reason?: string;
}
