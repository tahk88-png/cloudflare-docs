/**
 * Demo Dashboard Component
 * Uses mock data to demonstrate the dashboard UI
 * Replace with UserDashboard for production use with real API
 */

import { useState, useMemo } from "react";
import type {
	Rental,
	Invoice,
	Agreement,
	DashboardSummary as DashboardSummaryType,
} from "./types";
import { DashboardSummary } from "./components/DashboardSummary";
import { RentalsSection } from "./components/RentalsSection";
import { InvoicesSection } from "./components/InvoicesSection";
import { AgreementsSection } from "./components/AgreementsSection";

// Generate dates relative to now for demo
const now = new Date();
const addDays = (days: number) => {
	const date = new Date(now);
	date.setDate(date.getDate() + days);
	return date.toISOString();
};

// Mock data for demonstration
const mockSummary: DashboardSummaryType = {
	activeRentals: 2,
	upcomingRentals: 1,
	totalSpent: 156.5,
	currency: "EUR",
	memberSince: "2023-06-15T00:00:00Z",
};

const mockUser = {
	name: "Maria",
	email: "maria@example.com",
};

const mockRentals: Rental[] = [
	{
		id: "rental-001",
		lockerNumber: "A-12",
		lockerSize: "medium",
		location: {
			id: "loc-1",
			name: "Tallinn City Center",
			address: "Viru väljak 4",
			city: "Tallinn",
		},
		status: "active",
		startDate: addDays(-2),
		endDate: addDays(5),
		price: 24.99,
		currency: "EUR",
		agreementId: "agr-001",
		invoiceId: "inv-001",
	},
	{
		id: "rental-002",
		lockerNumber: "B-05",
		lockerSize: "small",
		location: {
			id: "loc-2",
			name: "Tartu Station",
			address: "Vaksali 6",
			city: "Tartu",
		},
		status: "active",
		startDate: addDays(-1),
		endDate: addDays(2),
		price: 14.99,
		currency: "EUR",
		agreementId: "agr-002",
		invoiceId: "inv-002",
	},
	{
		id: "rental-003",
		lockerNumber: "C-21",
		lockerSize: "large",
		location: {
			id: "loc-1",
			name: "Tallinn City Center",
			address: "Viru väljak 4",
			city: "Tallinn",
		},
		status: "upcoming",
		startDate: addDays(3),
		endDate: addDays(10),
		price: 49.99,
		currency: "EUR",
	},
	{
		id: "rental-004",
		lockerNumber: "A-08",
		lockerSize: "small",
		location: {
			id: "loc-3",
			name: "Pärnu Beach",
			address: "Ranna pst 1",
			city: "Pärnu",
		},
		status: "completed",
		startDate: addDays(-30),
		endDate: addDays(-23),
		price: 19.99,
		currency: "EUR",
		agreementId: "agr-003",
		invoiceId: "inv-003",
	},
	{
		id: "rental-005",
		lockerNumber: "D-15",
		lockerSize: "extra-large",
		location: {
			id: "loc-1",
			name: "Tallinn City Center",
			address: "Viru väljak 4",
			city: "Tallinn",
		},
		status: "completed",
		startDate: addDays(-60),
		endDate: addDays(-53),
		price: 59.99,
		currency: "EUR",
		agreementId: "agr-004",
		invoiceId: "inv-004",
	},
];

const mockInvoices: Invoice[] = [
	{
		id: "INV-2024-001",
		rentalId: "rental-001",
		amount: 24.99,
		currency: "EUR",
		status: "paid",
		issuedDate: addDays(-2),
		dueDate: addDays(5),
		paidDate: addDays(-2),
		downloadUrl: "/api/invoices/INV-2024-001/download",
	},
	{
		id: "INV-2024-002",
		rentalId: "rental-002",
		amount: 14.99,
		currency: "EUR",
		status: "paid",
		issuedDate: addDays(-1),
		dueDate: addDays(6),
		paidDate: addDays(-1),
		downloadUrl: "/api/invoices/INV-2024-002/download",
	},
	{
		id: "INV-2024-003",
		rentalId: "rental-003",
		amount: 49.99,
		currency: "EUR",
		status: "pending",
		issuedDate: addDays(0),
		dueDate: addDays(3),
		downloadUrl: "/api/invoices/INV-2024-003/download",
	},
	{
		id: "INV-2023-045",
		rentalId: "rental-004",
		amount: 19.99,
		currency: "EUR",
		status: "paid",
		issuedDate: addDays(-30),
		dueDate: addDays(-23),
		paidDate: addDays(-30),
		downloadUrl: "/api/invoices/INV-2023-045/download",
	},
];

const mockAgreements: Agreement[] = [
	{
		id: "agr-001",
		rentalId: "rental-001",
		signedDate: addDays(-2),
		documentUrl: "/api/agreements/agr-001/view",
		lockerInfo: "Locker A-12 at Tallinn City Center",
	},
	{
		id: "agr-002",
		rentalId: "rental-002",
		signedDate: addDays(-1),
		documentUrl: "/api/agreements/agr-002/view",
		lockerInfo: "Locker B-05 at Tartu Station",
	},
	{
		id: "agr-003",
		rentalId: "rental-004",
		signedDate: addDays(-30),
		documentUrl: "/api/agreements/agr-003/view",
		lockerInfo: "Locker A-08 at Pärnu Beach",
	},
	{
		id: "agr-004",
		rentalId: "rental-005",
		signedDate: addDays(-60),
		documentUrl: "/api/agreements/agr-004/view",
		lockerInfo: "Locker D-15 at Tallinn City Center",
	},
];

// Sort rentals helper
function sortRentals(rentals: Rental[], ascending: boolean): Rental[] {
	return [...rentals].sort((a, b) => {
		const dateA = new Date(a.startDate).getTime();
		const dateB = new Date(b.startDate).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

export default function DemoDashboard() {
	const [rentals] = useState(mockRentals);

	// Categorize rentals
	const categorizedRentals = useMemo(() => {
		const active: Rental[] = [];
		const upcoming: Rental[] = [];
		const past: Rental[] = [];

		rentals.forEach((rental) => {
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
	}, [rentals]);

	const handleRentAgain = () => {
		// Demo: Show alert instead of actual redirect
		alert("Demo: This would redirect you to book the same locker again!");
	};

	return (
		<div className="rentbox-dashboard">
			<DashboardSummary summary={mockSummary} userName={mockUser.name} />

			<div className="rentbox-dashboard__content">
				<div className="rentbox-dashboard__main">
					{/* Active Rentals */}
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
						onRentAgain={handleRentAgain}
					/>
				</div>

				<aside className="rentbox-dashboard__sidebar">
					{/* Invoices & Payments */}
					<InvoicesSection invoices={mockInvoices} />

					{/* Signed Agreements */}
					<AgreementsSection agreements={mockAgreements} />
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
