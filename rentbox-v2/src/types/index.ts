// ============================================================================
// Rentbox v2: Discounts, Vouchers & Campaigns System
// TypeScript Types & Interfaces
// ============================================================================

// ============================================================================
// DISCOUNT TYPES
// ============================================================================

export type DiscountType = 'percentage' | 'fixed' | 'free_time';

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number; // percentage (0-100), cents, or minutes
  is_stackable: boolean;
  valid_from: Date;
  valid_until: Date | null;
  max_uses: number | null;
  used_count: number;
  min_order_amount: number | null; // in cents
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DiscountCodeCreate {
  code: string;
  type: DiscountType;
  value: number;
  is_stackable?: boolean;
  valid_from?: Date;
  valid_until?: Date | null;
  max_uses?: number | null;
  min_order_amount?: number | null;
  is_active?: boolean;
}

export interface DiscountCodeUpdate {
  code?: string;
  type?: DiscountType;
  value?: number;
  is_stackable?: boolean;
  valid_from?: Date;
  valid_until?: Date | null;
  max_uses?: number | null;
  min_order_amount?: number | null;
  is_active?: boolean;
}

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export interface CampaignTimeRules {
  date_range?: {
    from: Date;
    to: Date;
  };
  weekdays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  time_windows?: Array<{
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone?: string; // defaults to UTC
  }>;
}

export interface CampaignLocationRules {
  locker_ids?: string[];
  cities?: string[];
  regions?: string[];
  compartments?: string[];
}

export interface CampaignProductRules {
  product_ids?: string[];
  categories?: string[];
  brands?: string[];
}

export interface CampaignUserRules {
  first_time_only?: boolean;
  returning_only?: boolean;
  b2b_only?: boolean;
  user_ids?: string[];
}

export interface CampaignBookingRules {
  min_duration?: number; // minutes
  max_duration?: number; // minutes
  min_order_value?: number; // cents
}

export interface CampaignRules {
  time?: CampaignTimeRules;
  location?: CampaignLocationRules;
  product?: CampaignProductRules;
  user?: CampaignUserRules;
  booking?: CampaignBookingRules;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  rules: CampaignRules;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignCreate {
  name: string;
  description?: string;
  is_active?: boolean;
  rules: CampaignRules;
}

export interface CampaignUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
  rules?: CampaignRules;
}

// ============================================================================
// VOUCHER TYPES
// ============================================================================

export interface Voucher {
  id: string;
  code: string;
  initial_amount: number; // in cents
  remaining_amount: number; // in cents
  currency: string; // ISO 4217 code
  expires_at: Date | null;
  is_active: boolean;
  purchased_by_user_id: string | null;
  recipient_email: string | null;
  gift_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VoucherCreate {
  code?: string; // Auto-generated if not provided
  initial_amount: number; // in cents
  currency?: string;
  expires_at?: Date | null;
  purchased_by_user_id?: string | null;
  recipient_email?: string | null;
  gift_message?: string | null;
}

export interface VoucherUpdate {
  remaining_amount?: number;
  expires_at?: Date | null;
  is_active?: boolean;
}

export interface GiftCardPurchaseRequest {
  amount: number; // in cents
  currency?: string;
  recipient_email?: string;
  gift_message?: string;
  expires_in_months?: number; // Default: 24
}

export interface GiftCardPurchaseResponse {
  voucher_id: string;
  voucher_code: string;
  amount: number;
  currency: string;
  expires_at: Date;
  payment_intent_id: string;
}

// ============================================================================
// REDEMPTION TYPES
// ============================================================================

export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  booking_id: string;
  amount: number; // in cents
  redeemed_at: Date;
  redeemed_by_user_id: string | null;
  liability_reduced_at: Date;
}

export interface DiscountRedemption {
  id: string;
  discount_code_id: string;
  booking_id: string;
  discount_amount: number; // in cents
  redeemed_at: Date;
  redeemed_by_user_id: string | null;
  campaign_id: string | null;
  booking_subtotal: number; // in cents
  booking_duration_minutes: number | null;
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CartItem {
  product_id: string;
  quantity: number;
  unit_price: number; // in cents
  duration_minutes: number;
  locker_id?: string;
  compartment_id?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number; // in cents (rental price only, excludes deposit)
  deposit: number; // in cents
  total: number; // in cents
  locker_id?: string;
  city?: string;
  region?: string;
}

export interface CodeApplicationRequest {
  code: string;
  cart: Cart;
  user_id?: string;
  booking_context?: {
    is_first_time?: boolean;
    is_b2b?: boolean;
  };
}

export interface CodeApplicationResult {
  success: boolean;
  type: 'discount' | 'voucher' | null;
  discount?: {
    id: string;
    code: string;
    type: DiscountType;
    discount_amount: number; // in cents
    new_subtotal: number; // in cents
    new_total: number; // in cents
  };
  voucher?: {
    id: string;
    code: string;
    applied_amount: number; // in cents
    remaining_balance: number; // in cents
    new_subtotal: number; // in cents
    new_total: number; // in cents
  };
  error?: {
    code: string;
    message: string;
    reason?: string;
  };
}

// ============================================================================
// ACCOUNTING TYPES
// ============================================================================

export interface VoucherLiabilityReport {
  total_outstanding_liability: number; // in cents
  expired_count: number;
  expired_amount: number; // in cents
  active_count: number;
  active_amount: number; // in cents
  breakdown_by_month?: Array<{
    month: string;
    sales: number;
    redemptions: number;
    net_liability: number;
  }>;
}

export interface DiscountUsageReport {
  campaign_id?: string;
  campaign_name?: string;
  discount_code_id?: string;
  discount_code?: string;
  total_redemptions: number;
  total_discount_amount: number; // in cents
  avg_discount_amount: number; // in cents
  period_start: Date;
  period_end: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
