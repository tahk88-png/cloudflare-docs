import { useState } from "react";

interface CalculatorProps {
	rentalPrice?: number;
	purchasePrice?: number;
	maintenanceCost?: number;
}

export default function RentVsBuyCalculator({
	rentalPrice = 100,
	purchasePrice = 10000,
	maintenanceCost = 200,
}: CalculatorProps) {
	const [months, setMonths] = useState(12);
	const [customRental, setCustomRental] = useState(rentalPrice);
	const [customPurchase, setCustomPurchase] = useState(purchasePrice);
	const [customMaintenance, setCustomMaintenance] = useState(maintenanceCost);

	const totalRentalCost = customRental * months;
	const totalPurchaseCost = customPurchase + customMaintenance * (months / 12);
	const savings = totalRentalCost - totalPurchaseCost;
	const breakEvenMonths = Math.ceil(
		customPurchase / (customRental - customMaintenance / 12),
	);

	return (
		<div className="rent-vs-buy-calculator p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
			<h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
				Rent vs Buy Calculator
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<div className="space-y-4">
					<label className="block">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Monthly Rental Cost ($)
						</span>
						<input
							type="number"
							value={customRental}
							onChange={(e) => setCustomRental(Number(e.target.value))}
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
						/>
					</label>

					<label className="block">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Purchase Price ($)
						</span>
						<input
							type="number"
							value={customPurchase}
							onChange={(e) => setCustomPurchase(Number(e.target.value))}
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
						/>
					</label>

					<label className="block">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Annual Maintenance Cost ($)
						</span>
						<input
							type="number"
							value={customMaintenance}
							onChange={(e) => setCustomMaintenance(Number(e.target.value))}
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
						/>
					</label>

					<label className="block">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Time Period (months)
						</span>
						<input
							type="number"
							value={months}
							onChange={(e) => setMonths(Number(e.target.value))}
							min="1"
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
						/>
					</label>
				</div>

				<div className="space-y-4">
					<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h3 className="font-semibold text-gray-900 dark:text-white mb-2">
							Total Rental Cost
						</h3>
						<p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
							${totalRentalCost.toLocaleString()}
						</p>
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
							Over {months} months
						</p>
					</div>

					<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<h3 className="font-semibold text-gray-900 dark:text-white mb-2">
							Total Purchase Cost
						</h3>
						<p className="text-3xl font-bold text-green-600 dark:text-green-400">
							${totalPurchaseCost.toLocaleString()}
						</p>
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
							Including maintenance
						</p>
					</div>

					<div
						className={`p-4 rounded-lg ${
							savings > 0
								? "bg-green-50 dark:bg-green-900/20"
								: "bg-red-50 dark:bg-red-900/20"
						}`}
					>
						<h3 className="font-semibold text-gray-900 dark:text-white mb-2">
							{savings > 0 ? "Savings" : "Additional Cost"}
						</h3>
						<p
							className={`text-3xl font-bold ${
								savings > 0
									? "text-green-600 dark:text-green-400"
									: "text-red-600 dark:text-red-400"
							}`}
						>
							${Math.abs(savings).toLocaleString()}
						</p>
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{savings > 0 ? "By purchasing" : "By renting"}
						</p>
					</div>

					{savings > 0 && (
						<div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
							<h3 className="font-semibold text-gray-900 dark:text-white mb-2">
								Break-Even Point
							</h3>
							<p className="text-xl font-bold text-gray-700 dark:text-gray-300">
								{breakEvenMonths} months
							</p>
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
								When purchase becomes cheaper
							</p>
						</div>
					)}
				</div>
			</div>

			<div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					<strong>Note:</strong> This calculator provides estimates only. Actual
					costs may vary based on usage, market conditions, and other factors.
				</p>
			</div>
		</div>
	);
}
