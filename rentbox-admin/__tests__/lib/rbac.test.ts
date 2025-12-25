import { hasPermission, hasMinimumRole, canPerform } from '@/lib/auth/rbac';
import { UserRole } from '@prisma/client';

describe('RBAC - Permission System', () => {
  describe('hasPermission', () => {
    it('should allow OWNER all permissions', () => {
      expect(hasPermission(UserRole.OWNER, 'products:create')).toBe(true);
      expect(hasPermission(UserRole.OWNER, 'users:create')).toBe(true);
      expect(hasPermission(UserRole.OWNER, 'bookings:create')).toBe(true);
      expect(hasPermission(UserRole.OWNER, 'settings:update')).toBe(true);
    });

    it('should allow ADMIN most permissions except user management', () => {
      expect(hasPermission(UserRole.ADMIN, 'products:create')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'bookings:create')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'settings:update')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'users:create')).toBe(false);
      expect(hasPermission(UserRole.ADMIN, 'users:change-role')).toBe(false);
    });

    it('should allow OPERATOR bookings and maintenance but not pricing', () => {
      expect(hasPermission(UserRole.OPERATOR, 'bookings:create')).toBe(true);
      expect(hasPermission(UserRole.OPERATOR, 'bookings:update')).toBe(true);
      expect(hasPermission(UserRole.OPERATOR, 'compartments:maintenance')).toBe(true);
      expect(hasPermission(UserRole.OPERATOR, 'products:update-price')).toBe(false);
      expect(hasPermission(UserRole.OPERATOR, 'products:create')).toBe(false);
      expect(hasPermission(UserRole.OPERATOR, 'users:read')).toBe(false);
    });

    it('should allow VIEWER only read permissions', () => {
      expect(hasPermission(UserRole.VIEWER, 'products:read')).toBe(true);
      expect(hasPermission(UserRole.VIEWER, 'bookings:read')).toBe(true);
      expect(hasPermission(UserRole.VIEWER, 'compartments:read')).toBe(true);
      expect(hasPermission(UserRole.VIEWER, 'products:create')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'bookings:create')).toBe(false);
      expect(hasPermission(UserRole.VIEWER, 'users:read')).toBe(false);
    });
  });

  describe('hasMinimumRole', () => {
    it('should correctly evaluate role hierarchy', () => {
      expect(hasMinimumRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
      expect(hasMinimumRole(UserRole.OWNER, UserRole.ADMIN)).toBe(true);
      expect(hasMinimumRole(UserRole.OWNER, UserRole.OPERATOR)).toBe(true);
      expect(hasMinimumRole(UserRole.OWNER, UserRole.VIEWER)).toBe(true);

      expect(hasMinimumRole(UserRole.ADMIN, UserRole.OWNER)).toBe(false);
      expect(hasMinimumRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasMinimumRole(UserRole.ADMIN, UserRole.OPERATOR)).toBe(true);
      expect(hasMinimumRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);

      expect(hasMinimumRole(UserRole.OPERATOR, UserRole.ADMIN)).toBe(false);
      expect(hasMinimumRole(UserRole.OPERATOR, UserRole.OPERATOR)).toBe(true);
      expect(hasMinimumRole(UserRole.OPERATOR, UserRole.VIEWER)).toBe(true);

      expect(hasMinimumRole(UserRole.VIEWER, UserRole.OPERATOR)).toBe(false);
      expect(hasMinimumRole(UserRole.VIEWER, UserRole.VIEWER)).toBe(true);
    });
  });

  describe('canPerform', () => {
    it('should return false for undefined role', () => {
      expect(canPerform(undefined, 'products:create')).toBe(false);
    });

    it('should correctly evaluate permissions', () => {
      expect(canPerform(UserRole.ADMIN, 'products:create')).toBe(true);
      expect(canPerform(UserRole.OPERATOR, 'products:create')).toBe(false);
      expect(canPerform(UserRole.VIEWER, 'bookings:read')).toBe(true);
    });
  });

  describe('Permission Scenarios', () => {
    it('should prevent VIEWER from creating bookings', () => {
      expect(canPerform(UserRole.VIEWER, 'bookings:create')).toBe(false);
    });

    it('should prevent OPERATOR from changing prices', () => {
      expect(canPerform(UserRole.OPERATOR, 'products:update-price')).toBe(false);
    });

    it('should allow OPERATOR to manage compartment maintenance', () => {
      expect(canPerform(UserRole.OPERATOR, 'compartments:maintenance')).toBe(true);
    });

    it('should prevent ADMIN from managing user roles', () => {
      expect(canPerform(UserRole.ADMIN, 'users:change-role')).toBe(false);
    });

    it('should only allow OWNER to manage user roles', () => {
      expect(canPerform(UserRole.OWNER, 'users:change-role')).toBe(true);
      expect(canPerform(UserRole.ADMIN, 'users:change-role')).toBe(false);
      expect(canPerform(UserRole.OPERATOR, 'users:change-role')).toBe(false);
    });

    it('should prevent VIEWER and OPERATOR from reading audit logs', () => {
      expect(canPerform(UserRole.VIEWER, 'audit:read')).toBe(false);
      expect(canPerform(UserRole.OPERATOR, 'audit:read')).toBe(false);
      expect(canPerform(UserRole.ADMIN, 'audit:read')).toBe(true);
      expect(canPerform(UserRole.OWNER, 'audit:read')).toBe(true);
    });

    it('should allow ADMIN and above to read settings', () => {
      expect(canPerform(UserRole.OWNER, 'settings:read')).toBe(true);
      expect(canPerform(UserRole.ADMIN, 'settings:read')).toBe(true);
      expect(canPerform(UserRole.OPERATOR, 'settings:read')).toBe(false);
      expect(canPerform(UserRole.VIEWER, 'settings:read')).toBe(false);
    });
  });
});
