// Admin UI Component for Feature Flags Management
import React, { useState, useEffect } from "react";
import type {
	FeatureFlagKey,
	FeatureFlagsResponse,
	UpdateFlagsRequest,
} from "../../lib/feature-flags/types";

const FLAG_DESCRIPTIONS: Record<FeatureFlagKey, string> = {
	enable_booking: "Allow users to create bookings",
	enable_checkout: "Enable checkout and payment processing",
	enable_discounts: "Allow discount code application",
	enable_vouchers: "Enable voucher redemption",
	enable_sms: "Send SMS notifications",
	enable_locker_access: "Enable locker access functionality",
	enable_notifications: "Enable push notifications",
};

interface FeatureFlagsPanelProps {
	apiBaseUrl?: string;
	authToken?: string;
	userId?: string;
	userEmail?: string;
}

export function FeatureFlagsPanel({
	apiBaseUrl = "/api",
	authToken,
	userId,
	userEmail,
}: FeatureFlagsPanelProps) {
	const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>({
		enable_booking: false,
		enable_checkout: false,
		enable_discounts: false,
		enable_vouchers: false,
		enable_sms: false,
		enable_locker_access: false,
		enable_notifications: false,
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [reason, setReason] = useState("");

	useEffect(() => {
		loadFlags();
	}, []);

	const loadFlags = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${apiBaseUrl}/system/flags`);
			if (!response.ok) {
				throw new Error("Failed to load feature flags");
			}
			const data: FeatureFlagsResponse = await response.json();
			setFlags(data.flags);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load flags");
		} finally {
			setLoading(false);
		}
	};

	const updateFlag = async (key: FeatureFlagKey, enabled: boolean) => {
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

			const updateRequest: UpdateFlagsRequest = {
				flags: { [key]: enabled },
				reason: reason || undefined,
			};

			const response = await fetch(`${apiBaseUrl}/admin/system/flags`, {
				method: "POST",
				headers,
				body: JSON.stringify(updateRequest),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update flag");
			}

			// Update local state
			setFlags((prev) => ({ ...prev, [key]: enabled }));
			setSuccess(`Flag ${key} ${enabled ? "enabled" : "disabled"} successfully`);
			setReason("");

			// Clear success message after 3 seconds
			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update flag");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="p-6 bg-white rounded-lg shadow">
				<div className="animate-pulse">Loading feature flags...</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-lg shadow">
			<h2 className="text-2xl font-bold mb-4">Feature Flags</h2>

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

			<div className="mb-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Reason for changes (optional):
				</label>
				<input
					type="text"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="e.g., Testing new feature, Emergency disable"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div className="space-y-4">
				{(Object.keys(flags) as FeatureFlagKey[]).map((key) => (
					<div
						key={key}
						className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						<div className="flex-1">
							<div className="font-medium text-gray-900">{key}</div>
							<div className="text-sm text-gray-500">
								{FLAG_DESCRIPTIONS[key]}
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={flags[key]}
								onChange={(e) => updateFlag(key, e.target.checked)}
								disabled={saving}
								className="sr-only peer"
							/>
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
							<span className="ml-3 text-sm font-medium text-gray-700">
								{flags[key] ? "Enabled" : "Disabled"}
							</span>
						</label>
					</div>
				))}
			</div>

			<div className="mt-6 pt-4 border-t border-gray-200">
				<button
					onClick={loadFlags}
					disabled={loading}
					className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
				>
					Refresh
				</button>
			</div>
		</div>
	);
}
