import prisma from "@/lib/db/prisma";
import type { Locker, LockerWithRelations } from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";
import type { CreateLockerInput, UpdateLockerInput } from "@/lib/validations";

/**
 * Get all lockers
 */
export async function getLockers(): Promise<LockerWithRelations[]> {
  const lockers = await prisma.locker.findMany({
    include: {
      compartments: true,
    },
    orderBy: { name: "asc" },
  });

  return lockers as LockerWithRelations[];
}

/**
 * Get a single locker by ID
 */
export async function getLockerById(
  id: string
): Promise<LockerWithRelations | null> {
  const locker = await prisma.locker.findUnique({
    where: { id },
    include: {
      compartments: {
        include: {
          product: true,
        },
        orderBy: { label: "asc" },
      },
    },
  });

  return locker as LockerWithRelations | null;
}

/**
 * Create a new locker
 */
export async function createLocker(
  data: CreateLockerInput,
  actorUserId: string
): Promise<Locker> {
  const locker = await prisma.locker.create({
    data: {
      name: data.name,
      locationText: data.locationText,
      timezone: data.timezone,
      active: data.active,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "locker",
    entityId: locker.id,
    after: locker as unknown as Record<string, unknown>,
  });

  return locker;
}

/**
 * Update a locker
 */
export async function updateLocker(
  data: UpdateLockerInput,
  actorUserId: string
): Promise<Locker> {
  const existing = await prisma.locker.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    throw new Error("Locker not found");
  }

  const locker = await prisma.locker.update({
    where: { id: data.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.locationText && { locationText: data.locationText }),
      ...(data.timezone && { timezone: data.timezone }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "locker",
    entityId: locker.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      locker as unknown as Record<string, unknown>
    ),
  });

  return locker;
}

/**
 * Delete a locker
 */
export async function deleteLocker(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.locker.findUnique({
    where: { id },
    include: { compartments: { select: { id: true } } },
  });

  if (!existing) {
    throw new Error("Locker not found");
  }

  // Check if locker has compartments
  if (existing.compartments && existing.compartments.length > 0) {
    throw new Error("Cannot delete locker with existing compartments");
  }

  await prisma.locker.delete({
    where: { id },
  });

  await createAuditLog({
    actorUserId,
    action: "delete",
    entityType: "locker",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });
}

/**
 * Toggle locker active status
 */
export async function toggleLockerActive(
  id: string,
  actorUserId: string
): Promise<Locker> {
  const existing = await prisma.locker.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Locker not found");
  }

  const locker = await prisma.locker.update({
    where: { id },
    data: { active: !existing.active },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "locker",
    entityId: locker.id,
    before: { active: existing.active },
    after: { active: locker.active },
  });

  return locker;
}
