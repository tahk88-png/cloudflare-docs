/**
 * RBAC Initialization
 * 
 * Initializes the RBAC system with default roles and users.
 * Should be called on application startup.
 */

import { initializeDefaultUsers } from "./storage";
import { getAllRoles } from "./roles";

/**
 * Initialize RBAC system
 */
export async function initializeRBAC(): Promise<void> {
	// Initialize default users
	await initializeDefaultUsers();

	// Log available roles
	const roles = getAllRoles();
	console.log(`RBAC initialized with ${roles.length} roles:`);
	roles.forEach((role) => {
		console.log(`  - ${role.role}: ${role.permissions.length} permissions`);
	});
}
