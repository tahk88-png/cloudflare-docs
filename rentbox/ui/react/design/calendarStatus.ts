import type { BookingStatus, CalendarEvent, CalendarScope, Slot } from "../types";

// -----------------------------------------
// Strict, consistent calendar status system
// -----------------------------------------
// Principle: one meaning = one color, across customer + admin.

export type CalendarStatusKey =
	| "available"
	| "limited"
	| "unavailable"
	| "pending"
	| "paid"
	| "active"
	| "overdue"
	| "completed"
	| "cancelled"
	| "expired"
	| "maintenance"
	| "blocked";

export type CalendarStatusTone = {
	hex: string;
	textOnBadge: "#FFFFFF" | "#111827";
};

export type CalendarStatusSpec = {
	key: CalendarStatusKey;
	label: string; // ET badge text
	color: CalendarStatusTone;
	icon?: string; // minimal indicator; never the only signal
};

export const CALENDAR_STATUS: Record<CalendarStatusKey, CalendarStatusSpec> = {
	// Customer availability
	available: {
		key: "available",
		label: "Vaba",
		color: { hex: "#16A34A", textOnBadge: "#FFFFFF" }, // Green 600
	},
	limited: {
		key: "limited",
		label: "Piiratud",
		color: { hex: "#F59E0B", textOnBadge: "#111827" }, // Amber 500 (dark text for contrast)
	},
	unavailable: {
		key: "unavailable",
		label: "Broneeritud",
		color: { hex: "#9CA3AF", textOnBadge: "#111827" }, // Gray 400 (dark text for contrast)
	},

	// Booking lifecycle
	pending: {
		key: "pending",
		label: "Ootel",
		color: { hex: "#64748B", textOnBadge: "#FFFFFF" }, // Slate 500
	},
	paid: {
		key: "paid",
		label: "Makstud",
		color: { hex: "#2563EB", textOnBadge: "#FFFFFF" }, // Blue 600
	},
	active: {
		key: "active",
		label: "Töös",
		color: { hex: "#4F46E5", textOnBadge: "#FFFFFF" }, // Indigo 600
	},
	overdue: {
		key: "overdue",
		label: "Hilinenud",
		color: { hex: "#DC2626", textOnBadge: "#FFFFFF" }, // Red 600
		icon: "⚠️",
	},
	completed: {
		key: "completed",
		label: "Lõpetatud",
		color: { hex: "#059669", textOnBadge: "#FFFFFF" }, // Emerald 600
	},
	cancelled: {
		key: "cancelled",
		label: "Tühistatud",
		color: { hex: "#6B7280", textOnBadge: "#FFFFFF" }, // Gray 500
	},
	expired: {
		key: "expired",
		label: "Aegunud",
		color: { hex: "#6B7280", textOnBadge: "#FFFFFF" }, // Gray 500
	},

	// Admin operations
	maintenance: {
		key: "maintenance",
		label: "Hooldus",
		color: { hex: "#EA580C", textOnBadge: "#FFFFFF" }, // Orange 600
		icon: "🔧",
	},
	blocked: {
		key: "blocked",
		label: "Blokeeritud",
		color: { hex: "#3F3F46", textOnBadge: "#FFFFFF" }, // Zinc 700
		icon: "🔒",
	},
};

export function statusForSlot(slot: Slot): CalendarStatusKey {
	if (slot.availability_level) return slot.availability_level;
	return slot.is_available ? "available" : "unavailable";
}

export function statusForBookingStatus(status: string): CalendarStatusKey {
	const s = status as BookingStatus;
	if (s === "pending") return "pending";
	if (s === "paid") return "paid";
	if (s === "active") return "active";
	if (s === "overdue") return "overdue";
	if (s === "completed") return "completed";
	if (s === "cancelled") return "cancelled";
	if (s === "expired") return "expired";
	// Fallback: treat unknown booking statuses as pending-ish (muted)
	return "pending";
}

export function statusForEvent(event: CalendarEvent): CalendarStatusKey {
	if (event.scope === "maintenance") return "maintenance";
	if (event.scope === "block") return "blocked";
	return statusForBookingStatus(event.status);
}

export function labelForScope(scope: CalendarScope): string {
	if (scope === "booking") return "Broneering";
	if (scope === "maintenance") return "Hooldus";
	return "Blokeeritud";
}

