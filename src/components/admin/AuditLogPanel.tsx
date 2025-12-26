// Admin UI Component for Audit Logs
import React, { useState, useEffect } from "react";
import type { AuditLog } from "../../lib/feature-flags/types";

interface AuditLogPanelProps {
	apiBaseUrl?: string;
	authToken?: string;
	limit?: number;
}

export function AuditLogPanel({
	apiBaseUrl = "/api",
	authToken,
	limit = 50,
}: AuditLogPanelProps) {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadLogs();
	}, []);

	const loadLogs = async () => {
		try {
			setLoading(true);
			// Note: You'll need to create this endpoint
			const response = await fetch(
				`${apiBaseUrl}/admin/system/audit-logs?limit=${limit}`,
				{
					headers: authToken
						? { Authorization: `Bearer ${authToken}` }
						: {},
				},
			);
			if (!response.ok) {
				throw new Error("Failed to load audit logs");
			}
			const data = await response.json();
			setLogs(data.logs || []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load audit logs");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const formatValue = (value: string | null) => {
		if (!value) return "-";
		try {
			const parsed = JSON.parse(value);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return value;
		}
	};

	if (loading) {
		return (
			<div className="p-6 bg-white rounded-lg shadow">
				<div className="animate-pulse">Loading audit logs...</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-white rounded-lg shadow">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-2xl font-bold">Audit Logs</h2>
				<button
					onClick={loadLogs}
					disabled={loading}
					className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
				>
					Refresh
				</button>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{error}
				</div>
			)}

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Time
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Action
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Entity
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								User
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Reason
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Changes
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{logs.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
									No audit logs found
								</td>
							</tr>
						) : (
							logs.map((log) => (
								<tr key={log.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm text-gray-900">
										{formatDate(log.created_at)}
									</td>
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										{log.action}
									</td>
									<td className="px-4 py-3 text-sm text-gray-500">
										{log.entity_type}
										{log.entity_id && ` (${log.entity_id})`}
									</td>
									<td className="px-4 py-3 text-sm text-gray-500">
										{log.user_email || log.user_id || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-500">
										{log.reason || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-gray-500">
										{log.old_value && (
											<div className="mb-1">
												<span className="text-red-600">Old:</span>{" "}
												<pre className="inline text-xs">
													{formatValue(log.old_value)}
												</pre>
											</div>
										)}
										{log.new_value && (
											<div>
												<span className="text-green-600">New:</span>{" "}
												<pre className="inline text-xs">
													{formatValue(log.new_value)}
												</pre>
											</div>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
