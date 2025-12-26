import { useState, useEffect } from "react";
import type { Rental } from "~/types/dashboard";
import StatusBadge from "./StatusBadge";

interface UpcomingRentalsProps {
	rentals: Rental[];
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
	const [timeLeft, setTimeLeft] = useState<string>("");

	useEffect(() => {
		const updateTimer = () => {
			const now = new Date().getTime();
			const target = new Date(targetDate).getTime();
			const difference = target - now;

			if (difference <= 0) {
				setTimeLeft("Starting now");
				return;
			}

			const days = Math.floor(difference / (1000 * 60 * 60 * 24));
			const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

			if (days > 0) {
				setTimeLeft(`${days}d ${hours}h`);
			} else if (hours > 0) {
				setTimeLeft(`${hours}h ${minutes}m`);
			} else {
				setTimeLeft(`${minutes}m`);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 60000); // Update every minute

		return () => clearInterval(interval);
	}, [targetDate]);

	return <span className="text-sm font-medium text-accent">{timeLeft}</span>;
}

export default function UpcomingRentals({ rentals }: UpcomingRentalsProps) {
	if (rentals.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				<p>No upcoming rentals</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{rentals.map((rental) => (
				<div
					key={rental.id}
					className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
				>
					<div className="flex flex-col sm:flex-row sm:items-start gap-4">
						{rental.itemImage && (
							<img
								src={rental.itemImage}
								alt={rental.itemName}
								className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
							/>
						)}
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-lg sm:text-xl mb-2">{rental.itemName}</h3>
							<div className="flex flex-wrap items-center gap-2 mb-3">
								<StatusBadge status={rental.status} />
								<CountdownTimer targetDate={rental.startDate} />
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Location:</strong>
									<span>{rental.lockerLocation}</span>
								</p>
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Locker:</strong>
									<span>{rental.lockerNumber}</span>
								</p>
								<p className="flex flex-wrap gap-1">
									<strong className="text-gray-700 dark:text-gray-300">Starts:</strong>
									<span>
										{new Date(rental.startDate).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</p>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
