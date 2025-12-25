// Booking Cart & Checkout System Types
// Rentbox.ee - 24/7 Self-Service Tool Rental Platform

export type CartStatus = 'active' | 'locked' | 'expired' | 'completed' | 'abandoned';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type PaymentProvider = 'stripe' | 'paypal' | 'bank_transfer';

export interface Cart {
	id: string;
	user_id: string | null;
	status: CartStatus;
	expires_at: Date;
	created_at: Date;
	updated_at: Date;
}

export interface CartItem {
	id: string;
	cart_id: string;
	product_id: string;
	start_at: Date;
	end_at: Date;
	price: number; // Calculated price in cents
	deposit: number; // Deposit amount in cents
	created_at: Date;
}

export interface CartLock {
	id: string;
	cart_id: string;
	product_id: string;
	compartment_id: string;
	start_at: Date;
	end_at: Date;
	expires_at: Date;
	created_at: Date;
}

export interface Booking {
	id: string;
	user_id: string;
	product_id: string;
	compartment_id: string;
	start_at: Date;
	end_at: Date;
	status: BookingStatus;
	total_price: number; // Total price in cents
	deposit: number; // Deposit amount in cents
	created_at: Date;
	updated_at: Date;
}

export interface Payment {
	id: string;
	cart_id: string | null;
	booking_id: string | null;
	provider: PaymentProvider;
	intent_id: string; // Stripe PaymentIntent ID or equivalent
	status: PaymentStatus;
	amount: number; // Amount in cents
	currency: string;
	created_at: Date;
	updated_at: Date;
}

export interface Product {
	id: string;
	name: string;
	description: string;
	base_price_per_hour: number; // In cents
	base_price_per_day: number; // In cents
	deposit_amount: number; // In cents
	locker_id: string;
	total_compartments: number;
	peak_hours_multiplier: number; // e.g., 1.5 for 50% increase
	weekend_multiplier: number; // e.g., 1.2 for 20% increase
	long_rental_discount_threshold_hours: number; // e.g., 24
	long_rental_discount_percent: number; // e.g., 10 for 10% off
	peak_hours_start: string; // HH:mm format, e.g., "17:00"
	peak_hours_end: string; // HH:mm format, e.g., "22:00"
	created_at: Date;
	updated_at: Date;
}

export interface Compartment {
	id: string;
	locker_id: string;
	product_id: string;
	compartment_number: string;
	is_active: boolean;
	created_at: Date;
}

export interface PriceBreakdown {
	base_price: number;
	peak_hours_surcharge: number;
	weekend_surcharge: number;
	long_rental_discount: number;
	subtotal: number;
	deposit: number;
	total: number;
	currency: string;
	hours: number;
	days: number;
	breakdown_items: Array<{
		label: string;
		amount: number;
		description?: string;
	}>;
}

export interface AvailabilityCheck {
	available: boolean;
	available_compartments: number;
	product_id: string;
	start_at: Date;
	end_at: Date;
	suggested_alternatives?: Array<{
		start_at: Date;
		end_at: Date;
	}>;
}

export interface CartValidationResult {
	valid: boolean;
	errors: Array<{
		item_id: string;
		product_id: string;
		error: string;
	}>;
	warnings: Array<{
		item_id: string;
		product_id: string;
		warning: string;
	}>;
}

export interface CheckoutRequest {
	cart_id: string;
	payment_method_id?: string;
	return_url: string;
}

export interface CheckoutResponse {
	checkout_id: string;
	payment_intent_id: string;
	client_secret: string;
	redirect_url: string;
	total_amount: number;
	currency: string;
}

export interface ExtendRentalRequest {
	booking_id: string;
	new_end_at: Date;
}

export interface ExtendRentalResponse {
	success: boolean;
	booking_id: string;
	original_end_at: Date;
	new_end_at: Date;
	additional_cost: number;
	payment_intent_id?: string;
	client_secret?: string;
	error?: string;
}
