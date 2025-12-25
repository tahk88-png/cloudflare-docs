import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { UserRole, SessionUser } from "@/lib/types";
import { getCurrentUser } from "./session";
import { logAccessAttempt } from "./logging";

// Role hierarchy - higher roles include permissions of lower roles
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  operator: 2,
  viewer: 1,
};

// Permission definitions
export const PERMISSIONS = {
  // Full access
  MANAGE_ROLES: ["owner"],
  MANAGE_SETTINGS: ["owner", "admin"],
  
  // Product management
  MANAGE_PRODUCTS: ["owner", "admin"],
  MANAGE_PRICING: ["owner", "admin"],
  MANAGE_CATEGORIES: ["owner", "admin"],
  
  // Booking management
  MANAGE_BOOKINGS: ["owner", "admin", "operator"],
  CONFIRM_BOOKINGS: ["owner", "admin", "operator"],
  CANCEL_BOOKINGS: ["owner", "admin", "operator"],
  
  // Locker/Compartment management
  MANAGE_LOCKERS: ["owner", "admin"],
  MANAGE_COMPARTMENTS: ["owner", "admin", "operator"],
  SET_MAINTENANCE: ["owner", "admin", "operator"],
  
  // View access
  VIEW_DASHBOARD: ["owner", "admin", "operator", "viewer"],
  VIEW_BOOKINGS: ["owner", "admin", "operator", "viewer"],
  VIEW_PRODUCTS: ["owner", "admin", "operator", "viewer"],
  VIEW_AUDIT_LOG: ["owner", "admin"],
  VIEW_USERS: ["owner", "admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role as never);
}

/**
 * Check if a role meets minimum role requirement
 */
export function meetsRoleRequirement(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Server-side guard for protected routes
 * Use in Server Components and Server Actions
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  if (!user) {
    await logAccessAttempt({
      success: false,
      reason: "No session",
      ip,
      userAgent,
    });
    redirect("/login");
  }

  return user;
}

/**
 * Server-side guard requiring specific role
 */
export async function requireRole(minimumRole: UserRole): Promise<SessionUser> {
  const user = await requireAuth();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  if (!meetsRoleRequirement(user.role, minimumRole)) {
    await logAccessAttempt({
      success: false,
      userId: user.id,
      reason: `Insufficient role: ${user.role} < ${minimumRole}`,
      ip,
      userAgent,
    });
    redirect("/admin?error=unauthorized");
  }

  return user;
}

/**
 * Server-side guard requiring specific permission
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  if (!hasPermission(user.role, permission)) {
    await logAccessAttempt({
      success: false,
      userId: user.id,
      reason: `Missing permission: ${permission}`,
      ip,
      userAgent,
    });
    redirect("/admin?error=unauthorized");
  }

  return user;
}

/**
 * Non-redirecting permission check for conditional UI
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return hasPermission(user.role, permission);
}

/**
 * For use in Server Actions - throws instead of redirecting
 */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized: No session");
  }

  if (!hasPermission(user.role, permission)) {
    throw new Error(`Unauthorized: Missing permission ${permission}`);
  }

  return user;
}
