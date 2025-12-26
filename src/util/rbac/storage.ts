/**
 * RBAC Storage Layer
 * 
 * Abstracted storage interface that can be swapped with Cloudflare D1, KV, or other storage.
 * Currently uses in-memory storage for development.
 * 
 * In production, this should be replaced with a persistent storage solution.
 */

import type { User, AuditLog, Role } from "./types";

// In-memory storage (replace with persistent storage in production)
const users = new Map<string, User>();
const auditLogs: AuditLog[] = [];

/**
 * Storage interface - implement this for different storage backends
 */
export interface RBACStorage {
	getUser(userId: string): Promise<User | null>;
	getUserByEmail(email: string): Promise<User | null>;
	createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
	updateUserRole(userId: string, newRole: Role, changedBy: string): Promise<User>;
	getAllUsers(): Promise<User[]>;
	
	createAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
	getAuditLogs(userId?: string): Promise<AuditLog[]>;
}

/**
 * In-memory storage implementation
 */
class InMemoryStorage implements RBACStorage {
	async getUser(userId: string): Promise<User | null> {
		return users.get(userId) || null;
	}

	async getUserByEmail(email: string): Promise<User | null> {
		for (const user of users.values()) {
			if (user.email === email) {
				return user;
			}
		}
		return null;
	}

	async createUser(
		userData: Omit<User, "id" | "createdAt" | "updatedAt">,
	): Promise<User> {
		const id = crypto.randomUUID();
		const now = new Date();
		const user: User = {
			...userData,
			id,
			createdAt: now,
			updatedAt: now,
		};
		users.set(id, user);
		return user;
	}

	async updateUserRole(
		userId: string,
		newRole: Role,
		changedBy: string,
	): Promise<User> {
		const user = users.get(userId);
		if (!user) {
			throw new Error(`User ${userId} not found`);
		}

		const previousRole = user.role;
		user.role = newRole;
		user.updatedAt = new Date();

		// Log the role change
		await this.createAuditLog({
			userId,
			action: previousRole ? "role_changed" : "role_assigned",
			previousRole: previousRole || undefined,
			newRole,
			changedBy,
		});

		return user;
	}

	async getAllUsers(): Promise<User[]> {
		return Array.from(users.values());
	}

	async createAuditLog(
		logData: Omit<AuditLog, "id" | "timestamp">,
	): Promise<AuditLog> {
		const log: AuditLog = {
			...logData,
			id: crypto.randomUUID(),
			timestamp: new Date(),
		};
		auditLogs.push(log);
		return log;
	}

	async getAuditLogs(userId?: string): Promise<AuditLog[]> {
		if (userId) {
			return auditLogs.filter((log) => log.userId === userId);
		}
		return [...auditLogs].sort((a, b) => 
			b.timestamp.getTime() - a.timestamp.getTime()
		);
	}
}

// Export singleton instance
export const storage: RBACStorage = new InMemoryStorage();

/**
 * Initialize default admin user (for development/testing)
 * In production, this should be done through a proper setup process
 */
export async function initializeDefaultUsers(): Promise<void> {
	// Check if admin already exists
	const existingAdmin = await storage.getUserByEmail("admin@example.com");
	if (!existingAdmin) {
		await storage.createUser({
			email: "admin@example.com",
			role: "admin",
		});
	}
}
