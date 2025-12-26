import type { RentalStatus, PaymentStatus } from "../types";

interface StatusBadgeProps {
	status: RentalStatus | PaymentStatus;
	size?: "sm" | "md";
}

const statusConfig: Record<
	RentalStatus | PaymentStatus,
	{ label: string; className: string }
> = {
	// Rental statuses
	active: {
		label: "Active",
		className: "rentbox-badge rentbox-badge--success",
	},
	upcoming: {
		label: "Upcoming",
		className: "rentbox-badge rentbox-badge--info",
	},
	completed: {
		label: "Completed",
		className: "rentbox-badge rentbox-badge--neutral",
	},
	cancelled: {
		label: "Cancelled",
		className: "rentbox-badge rentbox-badge--neutral",
	},
	overdue: {
		label: "Overdue",
		className: "rentbox-badge rentbox-badge--danger",
	},
	// Payment statuses
	paid: {
		label: "Paid",
		className: "rentbox-badge rentbox-badge--success",
	},
	pending: {
		label: "Pending",
		className: "rentbox-badge rentbox-badge--warning",
	},
	refunded: {
		label: "Refunded",
		className: "rentbox-badge rentbox-badge--info",
	},
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
	const config = statusConfig[status];
	const sizeClass = size === "sm" ? "rentbox-badge--sm" : "";

	return (
		<span className={`${config.className} ${sizeClass}`}>{config.label}</span>
	);
}
