/**
 * Authentication utilities for Incident Management
 * Admin-only access for certain endpoints
 */

/**
 * Check if request is from an admin user
 * This is a placeholder - implement based on your auth system
 */
export function isAdmin(request: Request, env: any): boolean {
	// Check for admin header or token
	// In production, implement proper authentication
	const adminToken = request.headers.get("X-Admin-Token");
	const expectedToken = env.ADMIN_TOKEN || "admin-secret-token-change-in-production";

	if (adminToken === expectedToken) {
		return true;
	}

	// Alternative: Check for Authorization header
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		if (token === expectedToken) {
			return true;
		}
	}

	return false;
}

/**
 * Get user identifier from request
 * For auto-created incidents, this might be a system identifier
 */
export function getUserId(request: Request): string {
	// Check for user header
	const userId = request.headers.get("X-User-ID");
	if (userId) {
		return userId;
	}

	// Check for user in Authorization header
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith("User ")) {
		return authHeader.slice(5);
	}

	// Default to system user for auto-created incidents
	return "system";
}
