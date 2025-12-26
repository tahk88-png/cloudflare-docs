// Feature Flags & Maintenance Mode Types

export type FeatureFlagKey =
	| "enable_booking"
	| "enable_checkout"
	| "enable_discounts"
	| "enable_vouchers"
	| "enable_sms"
	| "enable_locker_access"
	| "enable_notifications";

export type MaintenanceMode = "none" | "full" | "partial";

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface FeatureFlag {
	id: number;
	flag_key: FeatureFlagKey;
	enabled: boolean;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface MaintenanceModeConfig {
	id: number;
	mode: MaintenanceMode;
	message: string | null;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface ServiceHealth {
	id: number;
	service_name: string;
	status: ServiceStatus;
	last_check: string;
	updated_at: string;
}

export interface AuditLog {
	id: number;
	action: string;
	entity_type: string;
	entity_id: string | null;
	old_value: string | null;
	new_value: string | null;
	user_id: string | null;
	user_email: string | null;
	reason: string | null;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
}

export interface AdminUser {
	id: number;
	user_id: string;
	email: string;
	can_bypass_maintenance: boolean;
	created_at: string;
	updated_at: string;
}

export interface FeatureFlagsResponse {
	flags: Record<FeatureFlagKey, boolean>;
	maintenance: {
		mode: MaintenanceMode;
		enabled: boolean;
		message: string | null;
	};
}

export interface UpdateFlagsRequest {
	flags: Partial<Record<FeatureFlagKey, boolean>>;
	reason?: string;
}

export interface UpdateMaintenanceRequest {
	mode: MaintenanceMode;
	enabled: boolean;
	message?: string;
	reason?: string;
}
