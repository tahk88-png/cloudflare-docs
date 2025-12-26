import React, { useState, useEffect } from "react";
import type { AdminReturn } from "../types/booking";

interface AdminReturnsViewProps {
	authToken: string;
}

export default function AdminReturnsView({ authToken }: AdminReturnsViewProps) {
	const [returns, setReturns] = useState<AdminReturn[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<{
		status?: string;
		overdue?: string;
	}>({});

	useEffect(() => {
		fetchReturns();
	}, [filter]);

	const fetchReturns = async () => {
		setLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams();
			if (filter.status) params.append("status", filter.status);
			if (filter.overdue) params.append("overdue", filter.overdue);

			const response = await fetch(
				`/api/admin/returns?${params.toString()}`,
				{
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch returns");
			}

			const data = await response.json();
			setReturns(data.returns || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load returns");
		} finally {
			setLoading(false);
		}
	};

	const handleApprove = async (bookingId: string) => {
		try {
			const response = await fetch("/api/admin/returns", {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					booking_id: bookingId,
					action: "approved",
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to approve return");
			}

			// Refresh the list
			fetchReturns();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to approve return");
		}
	};

	const handleDispute = async (bookingId: string, notes: string) => {
		try {
			const response = await fetch("/api/admin/returns", {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					booking_id: bookingId,
					action: "disputed",
					admin_notes: notes,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to dispute return");
			}

			// Refresh the list
			fetchReturns();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to dispute return");
		}
	};

	if (loading) {
		return (
			<div className="p-6 text-center">
				<p className="text-gray-600">Loading returns...</p>
			</div>
		);
	}

	return (
		<div className="admin-returns-view p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					Return Confirmations
				</h1>

				<div className="flex gap-4 mb-4">
					<select
						value={filter.status || ""}
						onChange={(e) =>
							setFilter({ ...filter, status: e.target.value || undefined })
						}
						className="px-4 py-2 border border-gray-300 rounded-lg"
					>
						<option value="">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="confirmed">Confirmed</option>
						<option value="approved">Approved</option>
						<option value="disputed">Disputed</option>
					</select>

					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={filter.overdue === "true"}
							onChange={(e) =>
								setFilter({
									...filter,
									overdue: e.target.checked ? "true" : undefined,
								})
							}
							className="w-4 h-4"
						/>
						<span className="text-sm text-gray-700">Overdue only</span>
					</label>
				</div>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			{returns.length === 0 ? (
				<div className="text-center py-12 text-gray-500">
					No returns found matching your filters.
				</div>
			) : (
				<div className="space-y-4">
					{returns.map((returnItem) => (
						<div
							key={returnItem.booking_id}
							className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm"
						>
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-lg font-semibold text-gray-900">
										Booking #{returnItem.booking_id.slice(0, 8)}
									</h3>
									<p className="text-sm text-gray-600">
										Tool: {returnItem.tool_name || returnItem.tool_id}
									</p>
									<p className="text-sm text-gray-600">
										User: {returnItem.user_email || returnItem.user_id}
									</p>
								</div>
								<div className="text-right">
									<span
										className={`px-3 py-1 rounded-full text-xs font-medium ${
											returnItem.return_status === "approved"
												? "bg-green-100 text-green-800"
												: returnItem.return_status === "disputed"
													? "bg-red-100 text-red-800"
													: returnItem.return_status === "confirmed"
														? "bg-blue-100 text-blue-800"
														: "bg-yellow-100 text-yellow-800"
										}`}
									>
										{returnItem.return_status}
									</span>
									{returnItem.overdue && (
										<p className="text-xs text-red-600 mt-1">
											⚠️ {returnItem.days_overdue} day
											{returnItem.days_overdue !== 1 ? "s" : ""} overdue
										</p>
									)}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-4 text-sm">
								<div>
									<p className="text-gray-500">End Date</p>
									<p className="font-medium">
										{new Date(returnItem.end_at).toLocaleString()}
									</p>
								</div>
								<div>
									<p className="text-gray-500">Return Requested</p>
									<p className="font-medium">
										{new Date(
											returnItem.return_requested_at,
										).toLocaleString()}
									</p>
								</div>
							</div>

							{returnItem.return_photos && returnItem.return_photos.length > 0 && (
								<div className="mb-4">
									<p className="text-sm font-medium text-gray-700 mb-2">
										Return Photos:
									</p>
									<div className="grid grid-cols-3 gap-2">
										{returnItem.return_photos.map((photoUrl, index) => (
											<img
												key={index}
												src={photoUrl}
												alt={`Return photo ${index + 1}`}
												className="w-full h-32 object-cover rounded border border-gray-300"
											/>
										))}
									</div>
								</div>
							)}

							{returnItem.admin_notes && (
								<div className="mb-4 p-3 bg-gray-50 rounded">
									<p className="text-sm font-medium text-gray-700 mb-1">
										Admin Notes:
									</p>
									<p className="text-sm text-gray-600">
										{returnItem.admin_notes}
									</p>
								</div>
							)}

							{returnItem.return_status === "pending" && (
								<div className="flex gap-3 mt-4">
									<button
										onClick={() => handleApprove(returnItem.booking_id)}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
									>
										Approve Return
									</button>
									<button
										onClick={() => {
											const notes = prompt(
												"Enter reason for dispute:",
											);
											if (notes) {
												handleDispute(returnItem.booking_id, notes);
											}
										}}
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
									>
										Flag Issue
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
