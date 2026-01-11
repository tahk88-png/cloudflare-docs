export const RENTBOX_CALENDAR_STATUS = {
	// Customer availability hints (customer only)
	available: "available",
	limited: "limited",
	unavailable: "unavailable",

	// Bookings (customer + admin)
	pending: "pending",
	paid: "paid",
	active: "active",
	overdue: "overdue",
	completed: "completed",
	cancelled: "cancelled",
	expired: "expired",

	// Admin blocks
	maintenance: "maintenance",
	blocked: "blocked",
} as const;

export type RentboxCalendarStatus =
	(typeof RENTBOX_CALENDAR_STATUS)[keyof typeof RENTBOX_CALENDAR_STATUS];

export type RentboxCalendarIcon = "warning" | "wrench" | "lock";

export type RentboxCalendarStatusKind = "availability" | "booking" | "block";
export type RentboxCalendarAudience = "customer" | "admin" | "both";

export type RentboxCalendarStatusStyle = Readonly<{
	/**
	 * Background is locked to the provided hex values (no theme magic).
	 * Foreground is chosen per-status to satisfy WCAG AA for small text.
	 */
	bg: `#${string}`;
	fg: `#${string}`;
	border?: `#${string}`;
	borderStyle?: "solid" | "dashed";
	icon?: RentboxCalendarIcon;
	kind: RentboxCalendarStatusKind;
	audience: RentboxCalendarAudience;

	/** Operational logic used by calendar UI. */
	blocksAvailability: boolean;
}>;

/**
 * Status → style tokens.
 * Principle: one meaning = one color, everywhere.
 */
export const RENTBOX_CALENDAR_STATUS_STYLE: Record<
	RentboxCalendarStatus,
	RentboxCalendarStatusStyle
> = {
	// Customer hints (slot grid only)
	available: {
		bg: "#16A34A", // Green 600
		fg: "#111827", // ensures AA on #16A34A
		kind: "availability",
		audience: "customer",
		blocksAvailability: false,
	},
	limited: {
		bg: "#F59E0B", // Amber 500
		fg: "#111827", // ensures AA on #F59E0B
		kind: "availability",
		audience: "customer",
		blocksAvailability: false,
	},
	unavailable: {
		bg: "#9CA3AF", // Gray 400
		fg: "#111827", // ensures AA on #9CA3AF
		kind: "availability",
		audience: "customer",
		blocksAvailability: true,
	},

	// Bookings
	pending: {
		bg: "#64748B", // Slate 500
		fg: "#FFFFFF",
		kind: "booking",
		audience: "both",
		blocksAvailability: true, // TTL blocks
	},
	paid: {
		bg: "#2563EB", // Blue 600
		fg: "#FFFFFF",
		kind: "booking",
		audience: "both",
		blocksAvailability: true,
	},
	active: {
		bg: "#4F46E5", // Indigo 600
		fg: "#FFFFFF",
		kind: "booking",
		audience: "both",
		blocksAvailability: true,
	},
	overdue: {
		bg: "#DC2626", // Red 600
		fg: "#FFFFFF",
		icon: "warning",
		kind: "booking",
		audience: "both",
		blocksAvailability: true,
	},
	completed: {
		bg: "#059669", // Emerald 600
		fg: "#111827", // ensures AA on #059669
		kind: "booking",
		audience: "both",
		blocksAvailability: false,
	},
	cancelled: {
		bg: "#6B7280", // Gray 500
		fg: "#FFFFFF",
		border: "#6B7280",
		borderStyle: "dashed",
		kind: "booking",
		audience: "both",
		blocksAvailability: false,
	},
	expired: {
		bg: "#6B7280", // Gray 500
		fg: "#FFFFFF",
		border: "#6B7280",
		borderStyle: "dashed",
		kind: "booking",
		audience: "both",
		blocksAvailability: false,
	},

	// Admin blocks
	maintenance: {
		bg: "#EA580C", // Orange 600
		fg: "#111827", // ensures AA on #EA580C
		icon: "wrench",
		kind: "block",
		audience: "admin",
		blocksAvailability: true, // always overrides
	},
	blocked: {
		bg: "#3F3F46", // Zinc 700
		fg: "#FFFFFF",
		icon: "lock",
		kind: "block",
		audience: "admin",
		blocksAvailability: true,
	},
};

/** Status → badge text (ET). */
export const RENTBOX_CALENDAR_STATUS_LABEL_ET: Record<RentboxCalendarStatus, string> =
	{
		available: "Vaba",
		limited: "Piiratud",
		unavailable: "Broneeritud",
		pending: "Ootel",
		paid: "Makstud",
		active: "Töös",
		overdue: "Hilinenud",
		completed: "Lõpetatud",
		cancelled: "Tühistatud",
		expired: "Aegunud",
		maintenance: "Hooldus",
		blocked: "Blokeeritud",
	};

/** Fixed legend entries (as requested). */
export const RENTBOX_CALENDAR_LEGEND: RentboxCalendarStatus[] = [
	"available",
	"paid",
	"active",
	"overdue",
	"maintenance",
	"blocked",
];

export function getRentboxCalendarLabelET(status: RentboxCalendarStatus): string {
	return RENTBOX_CALENDAR_STATUS_LABEL_ET[status];
}

export function getRentboxCalendarStyle(
	status: RentboxCalendarStatus,
): RentboxCalendarStatusStyle {
	return RENTBOX_CALENDAR_STATUS_STYLE[status];
}

export function getRentboxCalendarIcon(
	status: RentboxCalendarStatus,
): RentboxCalendarIcon | undefined {
	return RENTBOX_CALENDAR_STATUS_STYLE[status].icon;
}

