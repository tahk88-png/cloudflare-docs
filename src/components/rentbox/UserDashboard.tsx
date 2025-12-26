import { useMemo } from "react";
import { useDashboard, useBookings, useInvoices } from "./hooks/useRentboxApi";
import { DashboardSummary } from "./components/DashboardSummary";
import { RentalsSection } from "./components/RentalsSection";
import { InvoicesSection } from "./components/InvoicesSection";
import { AgreementsSection } from "./components/AgreementsSection";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorMessage } from "./components/ErrorMessage";
import type { Rental } from "./types";

// Sort rentals by date (most recent first for past, soonest first for upcoming)
function sortRentals(rentals: Rental[], ascending: boolean): Rental[] {
	return [...rentals].sort((a, b) => {
		const dateA = new Date(a.startDate).getTime();
		const dateB = new Date(b.startDate).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

export default function UserDashboard() {
	const dashboard = useDashboard();
	const bookings = useBookings();
	const invoices = useInvoices();

	// Categorize rentals
	const categorizedRentals = useMemo(() => {
		if (!bookings.data?.rentals) {
			return { active: [], upcoming: [], past: [] };
		}

		const active: Rental[] = [];
		const upcoming: Rental[] = [];
		const past: Rental[] = [];

		bookings.data.rentals.forEach((rental) => {
			switch (rental.status) {
				case "active":
				case "overdue":
					active.push(rental);
					break;
				case "upcoming":
					upcoming.push(rental);
					break;
				case "completed":
				case "cancelled":
					past.push(rental);
					break;
			}
		});

		return {
			active: sortRentals(active, true),
			upcoming: sortRentals(upcoming, true),
			past: sortRentals(past, false),
		};
	}, [bookings.data]);

	// Show loading state
	if (dashboard.loading || bookings.loading || invoices.loading) {
		return (
			<div className="rentbox-dashboard rentbox-dashboard--loading">
				<LoadingSpinner size="lg" text="Loading your dashboard..." />
			</div>
		);
	}

	// Show error state
	if (dashboard.error) {
		return (
			<div className="rentbox-dashboard rentbox-dashboard--error">
				<ErrorMessage
					title="Unable to load dashboard"
					message={dashboard.error}
				/>
			</div>
		);
	}

	if (!dashboard.data) {
		return (
			<div className="rentbox-dashboard rentbox-dashboard--error">
				<ErrorMessage
					title="No data available"
					message="Please try refreshing the page"
				/>
			</div>
		);
	}

	return (
		<div className="rentbox-dashboard">
			<DashboardSummary
				summary={dashboard.data.summary}
				userName={dashboard.data.user.name}
			/>

			<div className="rentbox-dashboard__content">
				<div className="rentbox-dashboard__main">
					{/* Active Rentals - Most Important */}
					<RentalsSection
						title="Active Rentals"
						rentals={categorizedRentals.active}
						variant="active"
						emptyMessage="You don't have any active rentals at the moment."
					/>

					{/* Upcoming Rentals */}
					<RentalsSection
						title="Upcoming Rentals"
						rentals={categorizedRentals.upcoming}
						variant="upcoming"
						emptyMessage="No upcoming rentals scheduled."
					/>

					{/* Past Rentals */}
					<RentalsSection
						title="Past Rentals"
						rentals={categorizedRentals.past}
						variant="past"
						emptyMessage="No rental history yet. Book your first locker today!"
						onRentAgain={bookings.refetch}
					/>
				</div>

				<aside className="rentbox-dashboard__sidebar">
					{/* Invoices & Payments */}
					{invoices.error ? (
						<ErrorMessage
							title="Unable to load invoices"
							message={invoices.error}
						/>
					) : (
						<InvoicesSection invoices={invoices.data?.invoices || []} />
					)}

					{/* Signed Agreements */}
					<AgreementsSection agreements={invoices.data?.agreements || []} />
				</aside>
			</div>

			{/* Quick Actions */}
			<div className="rentbox-quick-actions">
				<a href="/book" className="rentbox-btn rentbox-btn--primary">
					Book a New Locker
				</a>
				<a href="/support" className="rentbox-btn rentbox-btn--secondary">
					Need Help?
				</a>
			</div>
		</div>
	);
}
