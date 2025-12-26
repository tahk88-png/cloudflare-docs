// Admin UI Component for Maintenance Mode Management
import React, { useState, useEffect } from "react";
import type {
	MaintenanceMode,
	FeatureFlagsResponse,
	UpdateMaintenanceRequest,
} from "../../lib/feature-flags/types";

interface MaintenanceModePanelProps {
	apiBaseUrl?: string;
	authToken?: string;
	userId?: string;
	userEmail?: string;
}

export function MaintenanceModePanel({
	apiBaseUrl = "/api",
	authToken,
	userId,
	userEmail,
}: MaintenanceModePanelProps) {
	const [mode, setMode] = useState<MaintenanceMode>("none");
	const [enabled, setEnabled] = useState(false);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [reason, setReason] = useState("");

	useEffect(() => {
		loadMaintenanceMode();
	}, []);

	const loadMaintenanceMode = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${apiBaseUrl}/system/flags`);
			if (!response.ok) {
				throw new Error("Failed to load maintenance mode");
			}
			const data: FeatureFlagsResponse = await response.json();
			setMode(data.maintenance.mode);
			setEnabled(data.maintenance.enabled);
			setMessage(data.maintenance.message || "");
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load maintenance mode");
		} finally {
			setLoading(false);
		}
	};

	const updateMaintenanceMode = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};

			if (authToken) {
				headers["Authorization"] = `Bearer ${authToken}`;
			}
			if (userId) {
				headers["x-user-id"] = userId;
			}
			if (userEmail) {
				headers["x-user-email"] = userEmail;
			}

			const updateRequest: UpdateMaintenanceRequest = {
				mode,
				enabled,
				message: message || undefined,
				reason: reason || undefined,
			};

			const response = await fetch(
				`${apiBaseUrl}/admin/system/maintenance`,
				{
					method: "POST",
					headers,
					body: JSON.stringify(updateRequest),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update maintenance mode");
			}

			setSuccess("Maintenance mode updated successfully");
			setReason("");

			// Clear success message after 3 seconds
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update maintenance mode");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="p-6 bg-white rounded-lg shadow">
				<div className="animate-pulse">Loading maintenance mode...</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-lg shadow">
			<h2 className="text-2xl font-bold mb-4">Maintenance Mode</h2>

			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{error}
				</div>
			)}

			{success && (
				<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
					{success}
				</div>
			)}

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Maintenance Mode Type
					</label>
					<select
						value={mode}
						onChange={(e) => setMode(e.target.value as MaintenanceMode)}
						disabled={saving}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="none">None (Normal Operation)</option>
						<option value="partial">Partial (Browsing Allowed, Checkout Disabled)</option>
						<option value="full">Full (All Public Access Blocked)</option>
					</select>
					<p className="mt-1 text-sm text-gray-500">
						{mode === "none" && "Normal operation - all features available"}
						{mode === "partial" &&
							"Users can browse but checkout and booking are disabled"}
						{mode === "full" &&
							"All public access is blocked. Admin users can still access."}
					</p>
				</div>

				<div>
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={enabled}
							onChange={(e) => setEnabled(e.target.checked)}
							disabled={saving}
							className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<span className="text-sm font-medium text-gray-700">
							Enable Maintenance Mode
						</span>
					</label>
					<p className="mt-1 text-sm text-gray-500">
						Maintenance mode only takes effect when enabled
					</p>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Maintenance Message (optional)
					</label>
					<textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="e.g., We're performing scheduled maintenance. Please check back in 30 minutes."
						rows={3}
						disabled={saving}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Reason for Change (optional)
					</label>
					<input
						type="text"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g., Scheduled maintenance, Emergency fix"
						disabled={saving}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<button
					onClick={updateMaintenanceMode}
					disabled={saving}
					className={`w-full px-4 py-2 rounded-md font-medium ${
						enabled && mode !== "none"
							? "bg-red-600 hover:bg-red-700 text-white"
							: "bg-blue-600 hover:bg-blue-700 text-white"
					} disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					{saving
						? "Saving..."
						: enabled && mode !== "none"
							? "Enable Maintenance Mode"
							: "Update Settings"}
				</button>
			</div>

			<div className="mt-6 pt-4 border-t border-gray-200">
				<button
					onClick={loadMaintenanceMode}
					disabled={loading}
					className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
				>
					Refresh
				</button>
			</div>
		</div>
	);
}
