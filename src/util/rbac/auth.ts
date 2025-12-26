/**
 * Authentication Utilities
 * 
 * Handles user authentication and session management.
 * In production, this should integrate with your authentication provider.
 */

import type { User } from "./types";
import { storage } from "./storage";

/**
 * Get current user from request
 * 
 * In a real application, this would extract user info from:
 * - JWT token in Authorization header
 * - Session cookie
 * - API key
 * 
 * For now, we'll use a simple header-based approach for development.
 */
export async function getCurrentUser(
	request: Request,
): Promise<User | null> {
	// Extract user ID from Authorization header or X-User-Id header
	// Format: "Bearer <user-id>" or just "<user-id>"
	const authHeader = request.headers.get("Authorization") || 
		request.headers.get("X-User-Id");
	
	if (!authHeader) {
		return null;
	}

	// Handle Bearer token format
	const userId = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	// For development, also support email lookup
	if (userId.includes("@")) {
		return await storage.getUserByEmail(userId);
	}

	return await storage.getUser(userId);
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(request: Request): Promise<User> {
	const user = await getCurrentUser(request);
	if (!user) {
		throw new Error("Authentication required");
	}
	return user;
}
