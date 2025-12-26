import { useState, useEffect } from "react";
import type { DashboardData } from "~/types/dashboard";
import ActiveRentals from "./ActiveRentals";
import UpcomingRentals from "./UpcomingRentals";
import PastRentals from "./PastRentals";
import Invoices from "./Invoices";
import Agreements from "./Agreements";

interface DashboardProps {
	authToken?: string;
}

export default function Dashboard({ authToken }: DashboardProps) {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchDashboard() {
			try {
				setLoading(true);
				const response = await fetch("/api/me/dashboard", {
					headers: {
						Authorization: authToken || "Bearer mock-token",
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
				}

				const dashboardData = await response.json();
				setData(dashboardData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load dashboard");
			} finally {
				setLoading(false);
			}
		}

		fetchDashboard();
	}, [authToken]);

	const handleRentAgain = (rentalId: string) => {
		// In production, navigate to booking page with pre-filled data
		console.log("Rent again:", rentalId);
		// window.location.href = `/book?rental=${rentalId}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-gray-500">Loading dashboard...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-red-500">Error: {error}</div>
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6 sm:space-y-8">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
					<div className="text-2xl font-bold">{data.activeRentals.length}</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Upcoming</div>
					<div className="text-2xl font-bold">{data.upcomingRentals.length}</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Past Rentals</div>
					<div className="text-2xl font-bold">{data.pastRentals.length}</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Invoices</div>
					<div className="text-2xl font-bold">{data.invoices.length}</div>
				</div>
			</div>

			{/* Active Rentals */}
			{data.activeRentals.length > 0 && (
				<section>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">Active Rentals</h2>
					<ActiveRentals rentals={data.activeRentals} onRentAgain={handleRentAgain} />
				</section>
			)}

			{/* Upcoming Rentals */}
			{data.upcomingRentals.length > 0 && (
				<section>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">Upcoming Rentals</h2>
					<UpcomingRentals rentals={data.upcomingRentals} />
				</section>
			)}

			{/* Past Rentals */}
			{data.pastRentals.length > 0 && (
				<section>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">Past Rentals</h2>
					<PastRentals rentals={data.pastRentals} onRentAgain={handleRentAgain} />
				</section>
			)}

			{/* Invoices & Payments */}
			{data.invoices.length > 0 && (
				<section>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">Invoices & Payments</h2>
					<Invoices invoices={data.invoices} />
				</section>
			)}

			{/* Signed Agreements */}
			{data.agreements.length > 0 && (
				<section>
					<h2 className="text-xl sm:text-2xl font-bold mb-4">Signed Agreements</h2>
					<Agreements agreements={data.agreements} />
				</section>
			)}
		</div>
	);
}
