export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  base_price_hourly: number;
  base_price_daily: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  start_at: string;
  end_at: string;
  price: number;
  deposit: number;
  pricing_breakdown: PricingBreakdown;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  status: 'active' | 'locked' | 'expired' | 'converted';
  expires_at: string;
  locked_at?: string;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
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

export interface CartTotals {
  subtotal: number;
  total_deposit: number;
  total: number;
}

export interface Booking {
  id: string;
  cart_id?: string;
  product_id: string;
  compartment_id: string;
  user_id?: string;
  start_at: string;
  end_at: string;
  status: 'confirmed' | 'active' | 'in_progress' | 'completed' | 'cancelled';
  total_price: number;
  deposit_amount: number;
  pricing_breakdown: PricingBreakdown;
  pickup_code?: string;
  return_code?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    error: string;
    details?: any;
  };
}
