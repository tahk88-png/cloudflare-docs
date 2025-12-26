import type { DashboardSummary as DashboardSummaryType } from "../types";
import { formatCurrency, formatDate } from "../utils/dateUtils";

interface DashboardSummaryProps {
	summary: DashboardSummaryType;
	userName: string;
}

function LockerIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M3 9h18" />
			<path d="M9 21V9" />
		</svg>
	);
}

function CalendarIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

function WalletIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
			<path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
			<path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
		</svg>
	);
}

function UserIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	);
}

export function DashboardSummary({ summary, userName }: DashboardSummaryProps) {
	return (
		<div className="rentbox-summary">
			<div className="rentbox-summary__greeting">
				<h1 className="rentbox-summary__title">Welcome back, {userName}!</h1>
				<p className="rentbox-summary__subtitle">
					Here's an overview of your rentals
				</p>
			</div>

			<div className="rentbox-summary__stats">
				<div className="rentbox-stat rentbox-stat--active">
					<div className="rentbox-stat__icon">
						<LockerIcon />
					</div>
					<div className="rentbox-stat__content">
						<span className="rentbox-stat__value">{summary.activeRentals}</span>
						<span className="rentbox-stat__label">Active Rentals</span>
					</div>
				</div>

				<div className="rentbox-stat rentbox-stat--upcoming">
					<div className="rentbox-stat__icon">
						<CalendarIcon />
					</div>
					<div className="rentbox-stat__content">
						<span className="rentbox-stat__value">{summary.upcomingRentals}</span>
						<span className="rentbox-stat__label">Upcoming</span>
					</div>
				</div>

				<div className="rentbox-stat rentbox-stat--spent">
					<div className="rentbox-stat__icon">
						<WalletIcon />
					</div>
					<div className="rentbox-stat__content">
						<span className="rentbox-stat__value">
							{formatCurrency(summary.totalSpent, summary.currency)}
						</span>
						<span className="rentbox-stat__label">Total Spent</span>
					</div>
				</div>

				<div className="rentbox-stat rentbox-stat--member">
					<div className="rentbox-stat__icon">
						<UserIcon />
					</div>
					<div className="rentbox-stat__content">
						<span className="rentbox-stat__value">
							{formatDate(summary.memberSince)}
						</span>
						<span className="rentbox-stat__label">Member Since</span>
					</div>
				</div>
			</div>
		</div>
	);
}
