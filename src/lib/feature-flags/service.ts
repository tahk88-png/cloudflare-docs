// Feature Flags Service with Caching
import type {
	FeatureFlag,
	FeatureFlagKey,
	MaintenanceModeConfig,
	ServiceHealth,
	ServiceStatus,
} from "./types";

const CACHE_TTL = 5; // 5 seconds cache TTL
const CACHE_KEY_FLAGS = "feature_flags";
const CACHE_KEY_MAINTENANCE = "maintenance_mode";
const CACHE_KEY_SERVICES = "service_health";

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

export class FeatureFlagsService {
	private cache: Map<string, CacheEntry<any>> = new Map();
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	private isCacheValid(entry: CacheEntry<any> | undefined): boolean {
		if (!entry) return false;
		return Date.now() - entry.timestamp < CACHE_TTL * 1000;
	}

	private setCache<T>(key: string, data: T): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	private getCache<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (this.isCacheValid(entry)) {
			return entry.data as T;
		}
		return null;
	}

	async getAllFlags(): Promise<Record<FeatureFlagKey, boolean>> {
		// Check cache first
		const cached = this.getCache<Record<FeatureFlagKey, boolean>>(
			CACHE_KEY_FLAGS,
		);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const flags = await this.db
			.prepare("SELECT flag_key, enabled FROM feature_flags")
			.all<FeatureFlag>();

		const flagsMap: Record<string, boolean> = {};
		for (const flag of flags.results) {
			flagsMap[flag.flag_key] = Boolean(flag.enabled);
		}

		// Ensure all flags exist with defaults
		const allFlags: Record<FeatureFlagKey, boolean> = {
			enable_booking: flagsMap.enable_booking ?? true,
			enable_checkout: flagsMap.enable_checkout ?? true,
			enable_discounts: flagsMap.enable_discounts ?? true,
			enable_vouchers: flagsMap.enable_vouchers ?? true,
			enable_sms: flagsMap.enable_sms ?? true,
			enable_locker_access: flagsMap.enable_locker_access ?? true,
			enable_notifications: flagsMap.enable_notifications ?? true,
		};

		// Cache the result
		this.setCache(CACHE_KEY_FLAGS, allFlags);

		return allFlags;
	}

	async getFlag(key: FeatureFlagKey): Promise<boolean> {
		const flags = await this.getAllFlags();
		return flags[key] ?? false;
	}

	async updateFlag(
		key: FeatureFlagKey,
		enabled: boolean,
	): Promise<FeatureFlag> {
		// Invalidate cache
		this.cache.delete(CACHE_KEY_FLAGS);

		const result = await this.db
			.prepare(
				"UPDATE feature_flags SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE flag_key = ? RETURNING *",
			)
			.bind(enabled ? 1 : 0, key)
			.first<FeatureFlag>();

		if (!result) {
			throw new Error(`Feature flag ${key} not found`);
		}

		return result;
	}

	async getMaintenanceMode(): Promise<MaintenanceModeConfig> {
		// Check cache first
		const cached = this.getCache<MaintenanceModeConfig>(CACHE_KEY_MAINTENANCE);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const result = await this.db
			.prepare("SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1")
			.first<MaintenanceModeConfig>();

		if (!result) {
			// Default maintenance mode
			return {
				id: 0,
				mode: "none",
				message: null,
				enabled: false,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
		}

		// Cache the result
		this.setCache(CACHE_KEY_MAINTENANCE, result);

		return result;
	}

	async updateMaintenanceMode(
		mode: "none" | "full" | "partial",
		enabled: boolean,
		message?: string,
	): Promise<MaintenanceModeConfig> {
		// Invalidate cache
		this.cache.delete(CACHE_KEY_MAINTENANCE);

		const result = await this.db
			.prepare(
				"UPDATE maintenance_mode SET mode = ?, enabled = ?, message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM maintenance_mode ORDER BY id DESC LIMIT 1) RETURNING *",
			)
			.bind(mode, enabled ? 1 : 0, message || null)
			.first<MaintenanceModeConfig>();

		if (!result) {
			// Insert if doesn't exist
			const insertResult = await this.db
				.prepare(
					"INSERT INTO maintenance_mode (mode, enabled, message) VALUES (?, ?, ?) RETURNING *",
				)
				.bind(mode, enabled ? 1 : 0, message || null)
				.first<MaintenanceModeConfig>();

			if (!insertResult) {
				throw new Error("Failed to create maintenance mode");
			}

			return insertResult;
		}

		return result;
	}

	async getServiceHealth(serviceName: string): Promise<ServiceStatus> {
		// Check cache first
		const cacheKey = `${CACHE_KEY_SERVICES}:${serviceName}`;
		const cached = this.getCache<ServiceStatus>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const result = await this.db
			.prepare("SELECT status FROM service_health WHERE service_name = ?")
			.bind(serviceName)
			.first<ServiceHealth>();

		const status: ServiceStatus = result?.status || "healthy";

		// Cache the result
		this.setCache(cacheKey, status);

		return status;
	}

	async updateServiceHealth(
		serviceName: string,
		status: ServiceStatus,
	): Promise<ServiceHealth> {
		// Invalidate cache
		this.cache.delete(`${CACHE_KEY_SERVICES}:${serviceName}`);

		const result = await this.db
			.prepare(
				"UPDATE service_health SET status = ?, last_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE service_name = ? RETURNING *",
			)
			.bind(status, serviceName)
			.first<ServiceHealth>();

		if (!result) {
			// Insert if doesn't exist
			const insertResult = await this.db
				.prepare(
					"INSERT INTO service_health (service_name, status) VALUES (?, ?) RETURNING *",
				)
				.bind(serviceName, status)
				.first<ServiceHealth>();

			if (!insertResult) {
				throw new Error(`Failed to create service health for ${serviceName}`);
			}

			return insertResult;
		}

		// Auto-disable features based on service health (failsafe)
		await this.applyFailsafeRules();

		return result;
	}

	private async applyFailsafeRules(): Promise<void> {
		const lockerStatus = await this.getServiceHealth("locker");
		const paymentsStatus = await this.getServiceHealth("payments");

		// If locker service is degraded or down, disable locker access
		if (lockerStatus === "degraded" || lockerStatus === "down") {
			await this.updateFlag("enable_locker_access", false);
		}

		// If payments service is degraded or down, disable checkout
		if (paymentsStatus === "degraded" || paymentsStatus === "down") {
			await this.updateFlag("enable_checkout", false);
		}
	}

	async checkMaintenanceBypass(userId: string): Promise<boolean> {
		const result = await this.db
			.prepare(
				"SELECT can_bypass_maintenance FROM admin_users WHERE user_id = ?",
			)
			.bind(userId)
			.first<{ can_bypass_maintenance: boolean }>();

		return result?.can_bypass_maintenance ?? false;
	}
}
