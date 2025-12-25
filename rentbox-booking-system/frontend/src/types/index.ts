// ═══════════════════════════════════════════════════════════════════════════
// RENTBOX FRONTEND - TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export type CartStatus = 'active' | 'locked' | 'completed' | 'expired' | 'abandoned';
export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'extended' | 'overdue' | 'cancelled';
export type LockStatus = 'locked' | 'available' | 'unavailable';

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT
// ═══════════════════════════════════════════════════════════════════════════

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price_per_hour: number;
  base_price_per_day: number;
  deposit_amount: number;
  image_url: string | null;
  specifications: Record<string, unknown>;
  is_active: boolean;
}

export interface ProductSummary {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════════════════════

export interface PriceBreakdown {
  base_price: number;
  hours: number;
  days: number;
  hourly_rate: number;
  daily_rate: number;
  subtotal: number;
  adjustments: PriceAdjustment[];
  deposit: number;
  total: number;
  currency: string;
}

export interface PriceAdjustment {
  name: string;
  type: 'multiplier' | 'fixed';
  value: number;
  amount: number;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════════════════════════

export interface Cart {
  id: string;
  status: CartStatus;
  expires_at: string;
  expires_in_seconds: number;
  items: CartItem[];
  summary: CartSummary;
  created_at: string;
}

export interface CartItem {
  id: string;
  product: ProductSummary;
  start_at: string;
  end_at: string;
  duration_hours: number;
  price: number;
  deposit: number;
  price_breakdown: PriceBreakdown;
  lock_status: LockStatus;
}

export interface CartSummary {
  items_count: number;
  subtotal: number;
  total_deposit: number;
  total: number;
  currency: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recalculated_items?: CartItem[];
}

export interface ValidationError {
  item_id?: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  item_id?: string;
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════

export interface CheckoutResponse {
  payment_intent_id: string;
  client_secret: string;
  payment_url: string;
  expires_at: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  bookings: Booking[];
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING
// ═══════════════════════════════════════════════════════════════════════════

export interface Booking {
  id: string;
  product: ProductSummary;
  compartment: CompartmentSummary;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  total_price: number;
  deposit_amount: number;
  pickup_code: string;
  pickup_instructions: string;
  created_at: string;
}

export interface CompartmentSummary {
  id: string;
  locker_name: string;
  locker_location: string;
  compartment_number: string;
}

export interface ExtendBookingResponse {
  success: boolean;
  booking?: Booking;
  payment_required?: boolean;
  payment_intent_id?: string;
  client_secret?: string;
  additional_cost?: number;
  error?: string;
  alternative_suggestion?: {
    available_until: string;
    reason: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
