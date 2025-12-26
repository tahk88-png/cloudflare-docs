import { useState } from "react";
import type { Rental } from "../types";
import { StatusBadge } from "./StatusBadge";
import {
	formatDate,
	formatTimeRemaining,
	formatCountdown,
	formatCurrency,
	getRentalDuration,
} from "../utils/dateUtils";
import { rentAgain } from "../hooks/useRentboxApi";

interface RentalCardProps {
	rental: Rental;
	variant: "active" | "upcoming" | "past";
	onRentAgain?: () => void;
}

const lockerSizeLabels: Record<Rental["lockerSize"], string> = {
	small: "S",
	medium: "M",
	large: "L",
	"extra-large": "XL",
};

function LockerIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="rentbox-icon"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M3 9h18" />
			<path d="M9 21V9" />
		</svg>
	);
}

function LocationIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="rentbox-icon rentbox-icon--sm"
		>
			<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="rentbox-icon rentbox-icon--sm"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

function CalendarIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="rentbox-icon rentbox-icon--sm"
		>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

export function RentalCard({ rental, variant, onRentAgain }: RentalCardProps) {
	const [isRenting, setIsRenting] = useState(false);
	const [rentError, setRentError] = useState<string | null>(null);

	const handleRentAgain = async () => {
		setIsRenting(true);
		setRentError(null);

		const result = await rentAgain(rental.id);

		if (result.success && result.redirectUrl) {
			window.location.href = result.redirectUrl;
		} else {
			setRentError(result.error || "Failed to create rental");
			setIsRenting(false);
		}

		onRentAgain?.();
	};

	return (
		<article
			className={`rentbox-card rentbox-card--${variant}`}
			aria-label={`${variant} rental at ${rental.location.name}`}
		>
			<div className="rentbox-card__header">
				<div className="rentbox-card__locker-info">
					<div className="rentbox-card__locker-icon">
						<LockerIcon />
						<span className="rentbox-card__locker-size">
							{lockerSizeLabels[rental.lockerSize]}
						</span>
					</div>
					<div className="rentbox-card__locker-details">
						<span className="rentbox-card__locker-number">
							Locker #{rental.lockerNumber}
						</span>
						<StatusBadge status={rental.status} size="sm" />
					</div>
				</div>
				<div className="rentbox-card__price">
					{formatCurrency(rental.price, rental.currency)}
				</div>
			</div>

			<div className="rentbox-card__body">
				<div className="rentbox-card__location">
					<LocationIcon />
					<div className="rentbox-card__location-text">
						<span className="rentbox-card__location-name">
							{rental.location.name}
						</span>
						<span className="rentbox-card__location-address">
							{rental.location.address}, {rental.location.city}
						</span>
					</div>
				</div>

				{variant === "active" && (
					<div className="rentbox-card__time-info rentbox-card__time-info--active">
						<ClockIcon />
						<span className="rentbox-card__time-remaining">
							{formatTimeRemaining(rental.endDate)}
						</span>
					</div>
				)}

				{variant === "upcoming" && (
					<div className="rentbox-card__time-info rentbox-card__time-info--upcoming">
						<ClockIcon />
						<span className="rentbox-card__countdown">
							{formatCountdown(rental.startDate)}
						</span>
					</div>
				)}

				<div className="rentbox-card__dates">
					<CalendarIcon />
					<span>
						{formatDate(rental.startDate)} – {formatDate(rental.endDate)}
					</span>
					<span className="rentbox-card__duration">
						({getRentalDuration(rental.startDate, rental.endDate)})
					</span>
				</div>
			</div>

			{variant === "past" && (
				<div className="rentbox-card__footer">
					<button
						onClick={handleRentAgain}
						disabled={isRenting}
						className="rentbox-btn rentbox-btn--primary rentbox-btn--full"
					>
						{isRenting ? "Processing..." : "Rent Again"}
					</button>
					{rentError && (
						<p className="rentbox-card__error">{rentError}</p>
					)}
				</div>
			)}
		</article>
	);
}
