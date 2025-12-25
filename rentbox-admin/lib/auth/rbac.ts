import { UserRole } from '@prisma/client';
import { getCurrentUser } from './session';

export const ROLE_HIERARCHY = {
  [UserRole.OWNER]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.OPERATOR]: 2,
  [UserRole.VIEWER]: 1,
};

export const PERMISSIONS = {
  // Categories
  'categories:read': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  'categories:create': [UserRole.OWNER, UserRole.ADMIN],
  'categories:update': [UserRole.OWNER, UserRole.ADMIN],
  'categories:delete': [UserRole.OWNER, UserRole.ADMIN],

  // Products
  'products:read': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  'products:create': [UserRole.OWNER, UserRole.ADMIN],
  'products:update': [UserRole.OWNER, UserRole.ADMIN],
  'products:delete': [UserRole.OWNER, UserRole.ADMIN],
  'products:update-price': [UserRole.OWNER, UserRole.ADMIN],

  // Lockers
  'lockers:read': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  'lockers:create': [UserRole.OWNER, UserRole.ADMIN],
  'lockers:update': [UserRole.OWNER, UserRole.ADMIN],
  'lockers:delete': [UserRole.OWNER, UserRole.ADMIN],

  // Compartments
  'compartments:read': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  'compartments:create': [UserRole.OWNER, UserRole.ADMIN],
  'compartments:update': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR],
  'compartments:delete': [UserRole.OWNER, UserRole.ADMIN],
  'compartments:maintenance': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR],

  // Bookings
  'bookings:read': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  'bookings:create': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR],
  'bookings:update': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR],
  'bookings:delete': [UserRole.OWNER, UserRole.ADMIN],
  'bookings:cancel': [UserRole.OWNER, UserRole.ADMIN, UserRole.OPERATOR],

  // Users
  'users:read': [UserRole.OWNER, UserRole.ADMIN],
  'users:create': [UserRole.OWNER],
  'users:update': [UserRole.OWNER],
  'users:delete': [UserRole.OWNER],
  'users:change-role': [UserRole.OWNER],

  // Settings
  'settings:read': [UserRole.OWNER, UserRole.ADMIN],
  'settings:update': [UserRole.OWNER, UserRole.ADMIN],

  // Audit Log
  'audit:read': [UserRole.OWNER, UserRole.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(userRole);
}

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export async function requireRole(minimumRole: UserRole) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized - Authentication required');
  }
  if (!hasMinimumRole(user.role, minimumRole)) {
    throw new Error(`Forbidden - Requires ${minimumRole} role or higher`);
  }
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized - Authentication required');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Forbidden - Missing permission: ${permission}`);
  }
  return user;
}

export function canPerform(userRole: UserRole | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, permission);
}
