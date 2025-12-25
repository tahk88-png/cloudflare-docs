// ═══════════════════════════════════════════════════════════════════════════
// RENTBOX BOOKING SYSTEM - TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export type CartStatus = 'active' | 'locked' | 'completed' | 'expired' | 'abandoned';
export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'extended' | 'overdue' | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentType = 'checkout' | 'extension' | 'deposit' | 'penalty';

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE ENTITIES
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
  created_at: Date;
  updated_at: Date;
}

export interface Locker {
  id: string;
  name: string;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  operating_hours: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Compartment {
  id: string;
  locker_id: string;
  product_id: string | null;
  compartment_number: string;
  size: string;
  hardware_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Cart {
  id: string;
  user_id: string | null;
  status: CartStatus;
  expires_at: Date;
  session_id: string | null;
  checkout_started_at: Date | null;
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
  price_breakdown: PriceBreakdown;
  created_at: Date;
  updated_at: Date;
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
  user_id: string | null;
  cart_id: string | null;
  product_id: string;
  compartment_id: string;
  start_at: Date;
  end_at: Date;
  original_end_at: Date | null;
  status: BookingStatus;
  total_price: number;
  deposit_amount: number;
  deposit_refunded: boolean;
  price_breakdown: PriceBreakdown;
  pickup_code: string | null;
  return_code: string | null;
  picked_up_at: Date | null;
  returned_at: Date | null;
  extension_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  cart_id: string | null;
  booking_id: string | null;
  provider: string;
  intent_id: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotency_key: string | null;
  provider_metadata: Record<string, unknown>;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Record<string, unknown>;
  multiplier: number;
  fixed_adjustment: number;
  priority: number;
  valid_from: Date | null;
  valid_until: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateCartRequest {
  user_id?: string;
  session_id?: string;
}

export interface AddCartItemRequest {
  product_id: string;
  start_at: string; // ISO date string
  end_at: string;   // ISO date string
}

export interface UpdateCartItemRequest {
  start_at?: string;
  end_at?: string;
}

export interface CheckoutRequest {
  payment_method?: string;
  return_url: string;
  customer_email?: string;
}

export interface ExtendBookingRequest {
  new_end_at: string; // ISO date string
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════════════════

export interface CartResponse {
  id: string;
  status: CartStatus;
  expires_at: string;
  expires_in_seconds: number;
  items: CartItemResponse[];
  summary: CartSummary;
  created_at: string;
}

export interface CartItemResponse {
  id: string;
  product: ProductSummary;
  start_at: string;
  end_at: string;
  duration_hours: number;
  price: number;
  deposit: number;
  price_breakdown: PriceBreakdown;
  lock_status: 'locked' | 'available' | 'unavailable';
}

export interface ProductSummary {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

export interface CartSummary {
  items_count: number;
  subtotal: number;
  total_deposit: number;
  total: number;
  currency: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recalculated_items?: CartItemResponse[];
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

export interface CheckoutResponse {
  payment_intent_id: string;
  client_secret: string;
  payment_url: string;
  expires_at: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  bookings: BookingResponse[];
  message: string;
}

export interface BookingResponse {
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
  booking?: BookingResponse;
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
// ADMIN TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminCartView extends Cart {
  items: CartItem[];
  locks: CartLock[];
  payment?: Payment;
}

export interface AdminBookingView extends Booking {
  product: Product;
  compartment: Compartment & { locker: Locker };
  payments: Payment[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class AvailabilityError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'AVAILABILITY_ERROR', message, details);
    this.name = 'AvailabilityError';
  }
}
