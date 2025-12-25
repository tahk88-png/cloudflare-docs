import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
	role: UserRole;
	active: boolean;
}

// Mock auth function - replace with your actual auth implementation
// This should check session/cookie/JWT and return the current user
export async function getCurrentUser(): Promise<AuthUser | null> {
	// TODO: Implement actual authentication
	// For now, return null to require login
	// In production, check session/cookie/JWT token
	
	// Example implementation:
	// const session = await getSession();
	// if (!session?.userId) return null;
	// const user = await prisma.user.findUnique({ where: { id: session.userId } });
	// if (!user || !user.active) return null;
	// return user;
	
	return null;
}

export async function requireAuth(): Promise<AuthUser> {
	const user = await getCurrentUser();
	if (!user) {
		redirect('/admin/login');
	}
	return user;
}

export async function requireRole(
	allowedRoles: UserRole[],
): Promise<AuthUser> {
	const user = await requireAuth();
	
	if (!allowedRoles.includes(user.role)) {
		throw new Error('Forbidden: Insufficient permissions');
	}
	
	return user;
}

export function canAccess(user: AuthUser, requiredRole: UserRole): boolean {
	const roleHierarchy: Record<UserRole, number> = {
		owner: 4,
		admin: 3,
		operator: 2,
		viewer: 1,
	};
	
	return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function canManagePricing(user: AuthUser): boolean {
	return user.role === 'owner' || user.role === 'admin';
}

export function canManageUsers(user: AuthUser): boolean {
	return user.role === 'owner';
}
