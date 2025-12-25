export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  base_price_hourly: number;
  base_price_daily: number;
  deposit_amount: number;
  status: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Compartment {
  id: string;
  locker_id: string;
  compartment_number: number;
  size?: string;
  status: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  status: 'active' | 'locked' | 'expired' | 'converted';
  expires_at: Date;
  locked_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  start_at: Date;
  end_at: Date;
  price: number;
  deposit: number;
  pricing_breakdown: PricingBreakdown;
  created_at: Date;
  updated_at: Date;
  product?: Product;
}

export interface CartLock {
  id: string;
  cart_id: string;
  cart_item_id: string;
  product_id: string;
  compartment_id: string;
  start_at: Date;
  end_at: Date;
  expires_at: Date;
  created_at: Date;
}

export interface Booking {
  id: string;
  cart_id?: string;
  product_id: string;
  compartment_id: string;
  user_id?: string;
  start_at: Date;
  end_at: Date;
  status: 'confirmed' | 'active' | 'in_progress' | 'completed' | 'cancelled';
  total_price: number;
  deposit_amount: number;
  pricing_breakdown: PricingBreakdown;
  pickup_code?: string;
  return_code?: string;
  extended_from?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  product?: Product;
  compartment?: Compartment;
}

export interface Payment {
  id: string;
  cart_id?: string;
  booking_ids?: string[];
  provider: 'stripe';
  intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  payment_method_types?: string[];
  metadata?: Record<string, any>;
  webhook_events?: any[];
  created_at: Date;
  updated_at: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  rule_type: 'peak_hours' | 'weekend' | 'duration_discount' | 'season' | 'custom';
  conditions: Record<string, any>;
  multiplier?: number;
  discount_percentage?: number;
  priority: number;
  active: boolean;
  valid_from?: Date;
  valid_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PricingBreakdown {
  base_price: number;
  hours: number;
  days: number;
  hourly_rate: number;
  daily_rate: number;
  subtotal: number;
  adjustments: PricingAdjustment[];
  total: number;
  deposit: number;
  currency: string;
}

export interface PricingAdjustment {
  type: 'multiplier' | 'discount' | 'fee';
  name: string;
  amount: number;
  percentage?: number;
  applied_to: number;
}

export interface AvailabilityCheck {
  available: boolean;
  product_id: string;
  start_at: Date;
  end_at: Date;
  available_compartments: number;
  message?: string;
}

export interface CreateCartItemRequest {
  product_id: string;
  start_at: string;
  end_at: string;
}

export interface UpdateCartItemRequest {
  start_at?: string;
  end_at?: string;
}

export interface CheckoutRequest {
  return_url: string;
  cancel_url: string;
  user_email?: string;
}

export interface ExtendBookingRequest {
  new_end_at: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
