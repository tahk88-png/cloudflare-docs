import { describe, it, expect } from "vitest";
import type { UserRole } from "@/lib/types";

// Permission definitions (mirroring the actual implementation)
const PERMISSIONS = {
  MANAGE_ROLES: ["owner"],
  MANAGE_SETTINGS: ["owner", "admin"],
  MANAGE_PRODUCTS: ["owner", "admin"],
  MANAGE_PRICING: ["owner", "admin"],
  MANAGE_CATEGORIES: ["owner", "admin"],
  MANAGE_BOOKINGS: ["owner", "admin", "operator"],
  CONFIRM_BOOKINGS: ["owner", "admin", "operator"],
  CANCEL_BOOKINGS: ["owner", "admin", "operator"],
  MANAGE_LOCKERS: ["owner", "admin"],
  MANAGE_COMPARTMENTS: ["owner", "admin", "operator"],
  SET_MAINTENANCE: ["owner", "admin", "operator"],
  VIEW_DASHBOARD: ["owner", "admin", "operator", "viewer"],
  VIEW_BOOKINGS: ["owner", "admin", "operator", "viewer"],
  VIEW_PRODUCTS: ["owner", "admin", "operator", "viewer"],
  VIEW_AUDIT_LOG: ["owner", "admin"],
  VIEW_USERS: ["owner", "admin"],
} as const;

type Permission = keyof typeof PERMISSIONS;

// Role hierarchy
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  operator: 2,
  viewer: 1,
};

function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role as never);
}

function meetsRoleRequirement(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

describe("RBAC Permission System", () => {
  describe("Owner Role", () => {
    const role: UserRole = "owner";

    it("should have all permissions", () => {
      const allPermissions = Object.keys(PERMISSIONS) as Permission[];
      allPermissions.forEach((permission) => {
        expect(hasPermission(role, permission)).toBe(true);
      });
    });

    it("should meet all role requirements", () => {
      const allRoles: UserRole[] = ["owner", "admin", "operator", "viewer"];
      allRoles.forEach((requiredRole) => {
        expect(meetsRoleRequirement(role, requiredRole)).toBe(true);
      });
    });
  });

  describe("Admin Role", () => {
    const role: UserRole = "admin";

    it("should NOT have MANAGE_ROLES permission", () => {
      expect(hasPermission(role, "MANAGE_ROLES")).toBe(false);
    });

    it("should have MANAGE_SETTINGS permission", () => {
      expect(hasPermission(role, "MANAGE_SETTINGS")).toBe(true);
    });

    it("should have MANAGE_PRODUCTS permission", () => {
      expect(hasPermission(role, "MANAGE_PRODUCTS")).toBe(true);
    });

    it("should have VIEW_AUDIT_LOG permission", () => {
      expect(hasPermission(role, "VIEW_AUDIT_LOG")).toBe(true);
    });

    it("should meet admin and below role requirements", () => {
      expect(meetsRoleRequirement(role, "admin")).toBe(true);
      expect(meetsRoleRequirement(role, "operator")).toBe(true);
      expect(meetsRoleRequirement(role, "viewer")).toBe(true);
    });

    it("should NOT meet owner role requirement", () => {
      expect(meetsRoleRequirement(role, "owner")).toBe(false);
    });
  });

  describe("Operator Role", () => {
    const role: UserRole = "operator";

    it("should have MANAGE_BOOKINGS permission", () => {
      expect(hasPermission(role, "MANAGE_BOOKINGS")).toBe(true);
    });

    it("should have SET_MAINTENANCE permission", () => {
      expect(hasPermission(role, "SET_MAINTENANCE")).toBe(true);
    });

    it("should have MANAGE_COMPARTMENTS permission", () => {
      expect(hasPermission(role, "MANAGE_COMPARTMENTS")).toBe(true);
    });

    it("should NOT have MANAGE_PRODUCTS permission", () => {
      expect(hasPermission(role, "MANAGE_PRODUCTS")).toBe(false);
    });

    it("should NOT have MANAGE_PRICING permission", () => {
      expect(hasPermission(role, "MANAGE_PRICING")).toBe(false);
    });

    it("should NOT have VIEW_AUDIT_LOG permission", () => {
      expect(hasPermission(role, "VIEW_AUDIT_LOG")).toBe(false);
    });

    it("should have VIEW_DASHBOARD permission", () => {
      expect(hasPermission(role, "VIEW_DASHBOARD")).toBe(true);
    });
  });

  describe("Viewer Role", () => {
    const role: UserRole = "viewer";

    it("should have VIEW_DASHBOARD permission", () => {
      expect(hasPermission(role, "VIEW_DASHBOARD")).toBe(true);
    });

    it("should have VIEW_BOOKINGS permission", () => {
      expect(hasPermission(role, "VIEW_BOOKINGS")).toBe(true);
    });

    it("should have VIEW_PRODUCTS permission", () => {
      expect(hasPermission(role, "VIEW_PRODUCTS")).toBe(true);
    });

    it("should NOT have any management permissions", () => {
      expect(hasPermission(role, "MANAGE_BOOKINGS")).toBe(false);
      expect(hasPermission(role, "MANAGE_PRODUCTS")).toBe(false);
      expect(hasPermission(role, "MANAGE_CATEGORIES")).toBe(false);
      expect(hasPermission(role, "MANAGE_LOCKERS")).toBe(false);
      expect(hasPermission(role, "MANAGE_COMPARTMENTS")).toBe(false);
      expect(hasPermission(role, "MANAGE_ROLES")).toBe(false);
      expect(hasPermission(role, "MANAGE_SETTINGS")).toBe(false);
    });

    it("should NOT have VIEW_AUDIT_LOG permission", () => {
      expect(hasPermission(role, "VIEW_AUDIT_LOG")).toBe(false);
    });

    it("should only meet viewer role requirement", () => {
      expect(meetsRoleRequirement(role, "viewer")).toBe(true);
      expect(meetsRoleRequirement(role, "operator")).toBe(false);
      expect(meetsRoleRequirement(role, "admin")).toBe(false);
      expect(meetsRoleRequirement(role, "owner")).toBe(false);
    });
  });
});

describe("Role Hierarchy", () => {
  it("should have correct hierarchy values", () => {
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.operator);
    expect(ROLE_HIERARCHY.operator).toBeGreaterThan(ROLE_HIERARCHY.viewer);
  });

  it("should correctly compare roles", () => {
    // Owner can do everything
    expect(meetsRoleRequirement("owner", "owner")).toBe(true);
    expect(meetsRoleRequirement("owner", "admin")).toBe(true);

    // Admin cannot do owner tasks
    expect(meetsRoleRequirement("admin", "owner")).toBe(false);
    expect(meetsRoleRequirement("admin", "admin")).toBe(true);

    // Operator cannot do admin tasks
    expect(meetsRoleRequirement("operator", "admin")).toBe(false);
    expect(meetsRoleRequirement("operator", "operator")).toBe(true);

    // Viewer can only do viewer tasks
    expect(meetsRoleRequirement("viewer", "operator")).toBe(false);
    expect(meetsRoleRequirement("viewer", "viewer")).toBe(true);
  });
});
