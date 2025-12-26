/**
 * Date and time utilities for Rentbox Dashboard
 */

export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function formatDateTime(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getTimeRemaining(endDateString: string): {
	days: number;
	hours: number;
	minutes: number;
	totalMinutes: number;
	isExpired: boolean;
} {
	const now = new Date();
	const endDate = new Date(endDateString);
	const diff = endDate.getTime() - now.getTime();

	if (diff <= 0) {
		return { days: 0, hours: 0, minutes: 0, totalMinutes: 0, isExpired: true };
	}

	const totalMinutes = Math.floor(diff / (1000 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	return { days, hours, minutes, totalMinutes, isExpired: false };
}

export function getCountdown(startDateString: string): {
	days: number;
	hours: number;
	minutes: number;
	hasStarted: boolean;
} {
	const now = new Date();
	const startDate = new Date(startDateString);
	const diff = startDate.getTime() - now.getTime();

	if (diff <= 0) {
		return { days: 0, hours: 0, minutes: 0, hasStarted: true };
	}

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	return { days, hours, minutes, hasStarted: false };
}

export function formatTimeRemaining(endDateString: string): string {
	const { days, hours, minutes, isExpired } = getTimeRemaining(endDateString);

	if (isExpired) {
		return "Expired";
	}

	if (days > 0) {
		return `${days}d ${hours}h remaining`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes}m remaining`;
	}

	return `${minutes}m remaining`;
}

export function formatCountdown(startDateString: string): string {
	const { days, hours, minutes, hasStarted } = getCountdown(startDateString);

	if (hasStarted) {
		return "Starting now";
	}

	if (days > 0) {
		return `Starts in ${days}d ${hours}h`;
	}

	if (hours > 0) {
		return `Starts in ${hours}h ${minutes}m`;
	}

	return `Starts in ${minutes}m`;
}

export function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: currency,
	}).format(amount);
}

export function getRentalDuration(
	startDate: string,
	endDate: string,
): string {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diff = end.getTime() - start.getTime();
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

	if (days === 1) {
		return "1 day";
	}

	if (days < 7) {
		return `${days} days`;
	}

	const weeks = Math.floor(days / 7);
	const remainingDays = days % 7;

	if (remainingDays === 0) {
		return weeks === 1 ? "1 week" : `${weeks} weeks`;
	}

	return weeks === 1
		? `1 week ${remainingDays}d`
		: `${weeks} weeks ${remainingDays}d`;
}
