import prisma from "@/lib/db/prisma";
import type { User, UserRole } from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";
import { hashPassword } from "@/lib/auth/password";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations";

/**
 * Get all users
 */
export async function getUsers(): Promise<Omit<User, "passwordHash">[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users;
}

/**
 * Get a single user by ID
 */
export async function getUserById(
  id: string
): Promise<Omit<User, "passwordHash"> | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Get a single user by email (includes password for auth)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Create a new user
 */
export async function createUser(
  data: CreateUserInput,
  actorUserId: string
): Promise<Omit<User, "passwordHash">> {
  // Check for email uniqueness
  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingEmail) {
    throw new Error("A user with this email already exists");
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
      active: data.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "user",
    entityId: user.id,
    after: user as unknown as Record<string, unknown>,
  });

  return user;
}

/**
 * Update a user
 */
export async function updateUser(
  data: UpdateUserInput,
  actorUserId: string,
  actorRole: UserRole
): Promise<Omit<User, "passwordHash">> {
  const existing = await prisma.user.findUnique({
    where: { id: data.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new Error("User not found");
  }

  // Only owners can change roles
  if (data.role && data.role !== existing.role && actorRole !== "owner") {
    throw new Error("Only owners can change user roles");
  }

  // Check email uniqueness if changed
  if (data.email && data.email !== existing.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new Error("A user with this email already exists");
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};
  if (data.email) updateData.email = data.email;
  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const user = await prisma.user.update({
    where: { id: data.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "user",
    entityId: user.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      user as unknown as Record<string, unknown>
    ),
  });

  return user;
}

/**
 * Delete a user
 */
export async function deleteUser(
  id: string,
  actorUserId: string
): Promise<void> {
  // Prevent self-deletion
  if (id === actorUserId) {
    throw new Error("Cannot delete your own account");
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!existing) {
    throw new Error("User not found");
  }

  await prisma.user.delete({
    where: { id },
  });

  await createAuditLog({
    actorUserId,
    action: "delete",
    entityType: "user",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });
}

/**
 * Toggle user active status
 */
export async function toggleUserActive(
  id: string,
  actorUserId: string
): Promise<Omit<User, "passwordHash">> {
  // Prevent self-deactivation
  if (id === actorUserId) {
    throw new Error("Cannot deactivate your own account");
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new Error("User not found");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active: !existing.active },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "user",
    entityId: user.id,
    before: { active: existing.active },
    after: { active: user.active },
  });

  return user;
}

/**
 * Update user last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
