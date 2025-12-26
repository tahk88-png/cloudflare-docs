/**
 * Admin Health Dashboard Component
 * React component for displaying system health information
 */

import React from "react";
import { AdminHealthDashboard, HealthStatus, ServiceType } from "../types";

interface AdminHealthDashboardProps {
	data: AdminHealthDashboard;
	onAcknowledgeAlert?: (alertId: string) => void;
}

export function AdminHealthDashboardComponent({
	data,
	onAcknowledgeAlert,
}: AdminHealthDashboardProps) {
	const getStatusColor = (status: HealthStatus): string => {
		switch (status) {
			case HealthStatus.OK:
				return "bg-green-500";
			case HealthStatus.DEGRADED:
				return "bg-yellow-500";
			case HealthStatus.DOWN:
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const getStatusTextColor = (status: HealthStatus): string => {
		switch (status) {
			case HealthStatus.OK:
				return "text-green-700";
			case HealthStatus.DEGRADED:
				return "text-yellow-700";
			case HealthStatus.DOWN:
				return "text-red-700";
			default:
				return "text-gray-700";
		}
	};

	const formatServiceName = (service: ServiceType): string => {
		return service
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">
						System Health Dashboard
					</h1>
					<p className="text-gray-600 mt-2">
						Last updated: {new Date(data.systemHealth.timestamp).toLocaleString()}
					</p>
				</div>

				{/* Overall Status Card */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-gray-800">
								Overall System Status
							</h2>
							<p className="text-gray-600 mt-1">
								Uptime: {data.uptime.overall.toFixed(2)}%
							</p>
						</div>
						<div
							className={`px-6 py-3 rounded-lg ${getStatusColor(
								data.systemHealth.overallStatus,
							)}`}
						>
							<span
								className={`text-2xl font-bold ${getStatusTextColor(
									data.systemHealth.overallStatus,
								)}`}
							>
								{data.systemHealth.overallStatus}
							</span>
						</div>
					</div>
				</div>

				{/* Services Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
					{data.systemHealth.services.map((service) => (
						<div
							key={service.service}
							className="bg-white rounded-lg shadow-md p-6"
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-800">
									{formatServiceName(service.service)}
								</h3>
								<div
									className={`w-4 h-4 rounded-full ${getStatusColor(
										service.status,
									)}`}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-gray-600">Status:</span>
									<span
										className={`font-medium ${getStatusTextColor(
											service.status,
										)}`}
									>
										{service.status}
									</span>
								</div>

								{service.responseTime !== undefined && (
									<div className="flex justify-between">
										<span className="text-gray-600">Response Time:</span>
										<span className="font-medium">
											{service.responseTime}ms
										</span>
									</div>
								)}

								{service.error && (
									<div className="mt-2 p-2 bg-red-50 rounded">
										<p className="text-sm text-red-800">{service.error}</p>
									</div>
								)}

								<div className="flex justify-between text-sm text-gray-500 mt-4">
									<span>
										Last checked:{" "}
										{new Date(service.lastChecked).toLocaleTimeString()}
									</span>
								</div>
							</div>

							{/* Error Rates */}
							{data.systemHealth.errorRates
								.filter((er) => er.service === service.service)
								.map((errorRate) => (
									<div key={errorRate.service} className="mt-4 pt-4 border-t">
										<h4 className="text-sm font-semibold text-gray-700 mb-2">
											Error Rates
										</h4>
										<div className="space-y-1 text-sm">
											<div className="flex justify-between">
												<span className="text-gray-600">Last 15 min:</span>
												<span className="font-medium">
													{errorRate.window15min.toFixed(2)}/min
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-600">Last 60 min:</span>
												<span className="font-medium">
													{errorRate.window60min.toFixed(2)}/min
												</span>
											</div>
										</div>
									</div>
								))}
						</div>
					))}
				</div>

				{/* Incidents Section */}
				{data.incidents.length > 0 && (
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">
							Recent Incidents
						</h2>
						<div className="space-y-4">
							{data.incidents.slice(0, 10).map((incident) => (
								<div
									key={incident.id}
									className="border-l-4 border-red-500 pl-4 py-2"
								>
									<div className="flex items-center justify-between">
										<div>
											<p className="font-semibold text-gray-800">
												{formatServiceName(incident.service)} -{" "}
												{incident.severity.toUpperCase()}
											</p>
											<p className="text-sm text-gray-600 mt-1">
												{incident.description}
											</p>
											{incident.error && (
												<p className="text-sm text-red-600 mt-1">
													{incident.error}
												</p>
											)}
										</div>
										<div className="text-right text-sm text-gray-500">
											<p>
												Started:{" "}
												{new Date(incident.startedAt).toLocaleString()}
											</p>
											{incident.resolvedAt && (
												<p>
													Resolved:{" "}
													{new Date(incident.resolvedAt).toLocaleString()}
												</p>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Alerts Section */}
				{data.recentAlerts.length > 0 && (
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">
							Recent Alerts
						</h2>
						<div className="space-y-3">
							{data.recentAlerts.slice(0, 20).map((alert) => (
								<div
									key={alert.id}
									className={`border-l-4 ${
										alert.severity === "down"
											? "border-red-500"
											: "border-yellow-500"
									} pl-4 py-2 flex items-center justify-between`}
								>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-gray-800">
												{formatServiceName(alert.service)}
											</span>
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${
													alert.severity === "down"
														? "bg-red-100 text-red-800"
														: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{alert.severity.toUpperCase()}
											</span>
											{alert.acknowledged && (
												<span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
													ACKNOWLEDGED
												</span>
											)}
										</div>
										<p className="text-sm text-gray-600 mt-1">{alert.message}</p>
										<p className="text-xs text-gray-500 mt-1">
											{new Date(alert.timestamp).toLocaleString()}
										</p>
									</div>
									{!alert.acknowledged && onAcknowledgeAlert && (
										<button
											onClick={() => onAcknowledgeAlert(alert.id)}
											className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
										>
											Acknowledge
										</button>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Last Incident Timestamp */}
				{data.systemHealth.lastIncidentTimestamp && (
					<div className="mt-6 text-center text-sm text-gray-500">
						Last incident:{" "}
						{new Date(
							data.systemHealth.lastIncidentTimestamp,
						).toLocaleString()}
					</div>
				)}
			</div>
		</div>
	);
}
