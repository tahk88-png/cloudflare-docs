// Authentication and authorization (RBAC)

import type { User, UserRole, Env } from './types';
import { Database } from './db';

export class AuthService {
	constructor(private db: Database) {}

	/**
	 * Verify API key or JWT token
	 */
	async authenticate(request: Request, env: Env): Promise<User | null> {
		// Check for API key in header
		const apiKey = request.headers.get('X-API-Key');
		if (apiKey) {
			return this.authenticateApiKey(apiKey);
		}

		// Check for Bearer token
		const authHeader = request.headers.get('Authorization');
		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			return this.authenticateJWT(token, env.JWT_SECRET);
		}

		return null;
	}

	private async authenticateApiKey(apiKey: string): Promise<User | null> {
		// Hash the API key and look up user
		// In production, use proper hashing (bcrypt, argon2, etc.)
		const hash = await this.hashApiKey(apiKey);
		
		// Query users by api_key_hash
		// This is simplified - in production, you'd have a proper lookup
		return null; // Placeholder
	}

	private async authenticateJWT(token: string, secret: string): Promise<User | null> {
		try {
			// Decode and verify JWT
			const parts = token.split('.');
			if (parts.length !== 3) return null;

			const payload = JSON.parse(atob(parts[1]));
			const userId = payload.sub;
			const companyId = payload.company_id;

			if (!userId || !companyId) return null;

			const user = await this.db.getUser(userId);
			if (!user || user.company_id !== companyId) return null;

			return user;
		} catch {
			return null;
		}
	}

	private async hashApiKey(apiKey: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(apiKey);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Check if user has required role
	 */
	hasPermission(user: User, requiredRole: UserRole): boolean {
		const roleHierarchy: Record<UserRole, number> = {
			viewer: 1,
			accountant: 2,
			admin: 3,
			owner: 4,
		};

		return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
	}

	/**
	 * Check if user can access company resource
	 */
	canAccessCompany(user: User, companyId: string): boolean {
		return user.company_id === companyId;
	}

	/**
	 * Check if user can modify invoice
	 */
	canModifyInvoice(user: User, invoice: { company_id: string; status: string }): boolean {
		if (!this.canAccessCompany(user, invoice.company_id)) {
			return false;
		}

		// Only draft invoices can be modified
		if (invoice.status !== 'draft') {
			return this.hasPermission(user, 'admin'); // Only admins can modify non-drafts
		}

		// Accountants and above can modify drafts
		return this.hasPermission(user, 'accountant');
	}

	/**
	 * Check if user can send invoice
	 */
	canSendInvoice(user: User, invoice: { company_id: string }): boolean {
		if (!this.canAccessCompany(user, invoice.company_id)) {
			return false;
		}
		return this.hasPermission(user, 'accountant');
	}

	/**
	 * Check if user can view invoice
	 */
	canViewInvoice(user: User, invoice: { company_id: string }): boolean {
		if (!this.canAccessCompany(user, invoice.company_id)) {
			return false;
		}
		return this.hasPermission(user, 'viewer');
	}
}
