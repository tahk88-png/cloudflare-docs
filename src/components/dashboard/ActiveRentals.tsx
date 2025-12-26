import { useState, useEffect } from "react";
import type { Rental } from "~/types/dashboard";
import StatusBadge from "./StatusBadge";

interface ActiveRentalsProps {
	rentals: Rental[];
	onRentAgain?: (rentalId: string) => void;
}

export default function ActiveRentals({ rentals, onRentAgain }: ActiveRentalsProps) {
	if (rentals.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				<p>No active rentals</p>
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
								{rental.timeLeft && (
									<span className="text-sm text-gray-600 dark:text-gray-400">
										{rental.timeLeft} left
									</span>
								)}
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
									<strong className="text-gray-700 dark:text-gray-300">Ends:</strong>
									<span>
										{new Date(rental.endDate).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
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
