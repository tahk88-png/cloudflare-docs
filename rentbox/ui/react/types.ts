export type ISODateTime = string; // ISO 8601 with offset or Z
export type ISODate = string; // YYYY-MM-DD (interpreted in tz)

export type TimeZone = "Europe/Tallinn" | string;

export interface Slot {
	start_at: ISODateTime;
	end_at: ISODateTime;
	is_available: boolean;
	// Optional hint from server when availability is low (customer only).
	availability_level?: "available" | "limited" | "unavailable";
}

export interface AvailabilityResponse {
	available: boolean;
	next_available_at: ISODateTime | null;
}

export type BookingStatus =
	| "pending"
	| "paid"
	| "active"
	| "completed"
	| "overdue"
	| "cancelled"
	| "expired";

export type CalendarScope = "booking" | "maintenance" | "block";

export interface CalendarEvent {
	id: number | string;
	scope: CalendarScope;
	status: string;
	title: string;
	start_at: ISODateTime;
	end_at: ISODateTime;
	locker_id?: number | null;
	compartment_id?: number | null;
	product_id?: number | null;
	meta?: Record<string, unknown>;
}

export interface AdminFilters {
	statuses: Set<string>; // booking statuses
	scopes: Set<CalendarScope>;
	productId?: number | null;
	search?: string;
}

export interface LockerOption {
	id: number;
	name: string;
	timezone?: TimeZone;
}

export interface CompartmentOption {
	id: number;
	code: string;
	locker_id: number;
	is_active?: boolean;
}

export interface ProductOption {
	id: number;
	name: string;
	slug?: string;
}

export interface ApiErrorShape {
	error: string;
	message?: string;
	details?: Record<string, unknown>;
}
