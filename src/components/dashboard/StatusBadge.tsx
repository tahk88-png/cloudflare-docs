import type { RentalStatus } from "~/types/dashboard";

interface StatusBadgeProps {
	status: RentalStatus;
	className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
	const statusConfig = {
		active: {
			label: "Active",
			variant: "success" as const,
		},
		upcoming: {
			label: "Upcoming",
			variant: "note" as const,
		},
		completed: {
			label: "Completed",
			variant: "default" as const,
		},
		cancelled: {
			label: "Cancelled",
			variant: "danger" as const,
		},
	};

	const config = statusConfig[status];

	return (
		<span className={`sl-badge ${config.variant} ${className}`}>
			{config.label}
		</span>
	);
}
