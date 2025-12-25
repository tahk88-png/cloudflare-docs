import prisma from "@/lib/db/prisma";
import type { Compartment, CompartmentWithRelations } from "@/lib/types";
import { createAuditLog, createAuditDiff } from "./audit";
import type { CreateCompartmentInput, UpdateCompartmentInput } from "@/lib/validations";

/**
 * Get all compartments with optional locker filter
 */
export async function getCompartments(params?: {
  lockerId?: string;
  active?: boolean;
}): Promise<CompartmentWithRelations[]> {
  const where = {
    ...(params?.lockerId && { lockerId: params.lockerId }),
    ...(params?.active !== undefined && { active: params.active }),
  };

  const compartments = await prisma.compartment.findMany({
    where,
    include: {
      locker: true,
      product: true,
    },
    orderBy: [{ locker: { name: "asc" } }, { label: "asc" }],
  });

  return compartments as CompartmentWithRelations[];
}

/**
 * Get a single compartment by ID
 */
export async function getCompartmentById(
  id: string
): Promise<CompartmentWithRelations | null> {
  const compartment = await prisma.compartment.findUnique({
    where: { id },
    include: {
      locker: true,
      product: true,
      bookings: {
        where: {
          status: { in: ["pending", "confirmed"] },
          endsAt: { gt: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 10,
      },
    },
  });

  return compartment as CompartmentWithRelations | null;
}

/**
 * Create a new compartment
 */
export async function createCompartment(
  data: CreateCompartmentInput,
  actorUserId: string
): Promise<Compartment> {
  // Verify locker exists
  const locker = await prisma.locker.findUnique({
    where: { id: data.lockerId },
  });

  if (!locker) {
    throw new Error("Locker not found");
  }

  // Check label uniqueness within locker
  const existingLabel = await prisma.compartment.findFirst({
    where: {
      lockerId: data.lockerId,
      label: data.label,
    },
  });

  if (existingLabel) {
    throw new Error("A compartment with this label already exists in this locker");
  }

  // Verify product exists if provided
  if (data.productId) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      throw new Error("Product not found");
    }
    if (!product.active && data.active) {
      throw new Error("Cannot assign inactive product to active compartment");
    }
  }

  const compartment = await prisma.compartment.create({
    data: {
      lockerId: data.lockerId,
      label: data.label,
      productId: data.productId,
      active: data.active,
      notes: data.notes,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "create",
    entityType: "compartment",
    entityId: compartment.id,
    after: compartment as unknown as Record<string, unknown>,
  });

  return compartment;
}

/**
 * Update a compartment
 */
export async function updateCompartment(
  data: UpdateCompartmentInput,
  actorUserId: string
): Promise<Compartment> {
  const existing = await prisma.compartment.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    throw new Error("Compartment not found");
  }

  // Check label uniqueness if changed
  if (data.label && data.label !== existing.label) {
    const existingLabel = await prisma.compartment.findFirst({
      where: {
        lockerId: data.lockerId || existing.lockerId,
        label: data.label,
        id: { not: data.id },
      },
    });
    if (existingLabel) {
      throw new Error("A compartment with this label already exists in this locker");
    }
  }

  // Verify product exists if changing
  if (data.productId && data.productId !== existing.productId) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      throw new Error("Product not found");
    }
    const isActive = data.active !== undefined ? data.active : existing.active;
    if (!product.active && isActive) {
      throw new Error("Cannot assign inactive product to active compartment");
    }
  }

  const compartment = await prisma.compartment.update({
    where: { id: data.id },
    data: {
      ...(data.lockerId && { lockerId: data.lockerId }),
      ...(data.label && { label: data.label }),
      ...(data.productId !== undefined && { productId: data.productId }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "compartment",
    entityId: compartment.id,
    ...createAuditDiff(
      existing as unknown as Record<string, unknown>,
      compartment as unknown as Record<string, unknown>
    ),
  });

  return compartment;
}

/**
 * Delete a compartment
 */
export async function deleteCompartment(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.compartment.findUnique({
    where: { id },
    include: { bookings: { where: { status: { in: ["pending", "confirmed"] } } } },
  });

  if (!existing) {
    throw new Error("Compartment not found");
  }

  // Check if compartment has active bookings
  if (existing.bookings && existing.bookings.length > 0) {
    throw new Error("Cannot delete compartment with active bookings");
  }

  await prisma.compartment.delete({
    where: { id },
  });

  await createAuditLog({
    actorUserId,
    action: "delete",
    entityType: "compartment",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });
}

/**
 * Set compartment maintenance status
 */
export async function setCompartmentMaintenance(
  id: string,
  active: boolean,
  notes: string,
  actorUserId: string
): Promise<Compartment> {
  const existing = await prisma.compartment.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Compartment not found");
  }

  const compartment = await prisma.compartment.update({
    where: { id },
    data: {
      active,
      notes,
    },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "compartment",
    entityId: compartment.id,
    before: { active: existing.active, notes: existing.notes },
    after: { active: compartment.active, notes: compartment.notes },
  });

  return compartment;
}

/**
 * Assign product to compartment
 */
export async function assignProductToCompartment(
  compartmentId: string,
  productId: string | null,
  actorUserId: string
): Promise<Compartment> {
  const existing = await prisma.compartment.findUnique({
    where: { id: compartmentId },
  });

  if (!existing) {
    throw new Error("Compartment not found");
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new Error("Product not found");
    }
    if (!product.active && existing.active) {
      throw new Error("Cannot assign inactive product to active compartment");
    }
  }

  const compartment = await prisma.compartment.update({
    where: { id: compartmentId },
    data: { productId },
  });

  await createAuditLog({
    actorUserId,
    action: "update",
    entityType: "compartment",
    entityId: compartment.id,
    before: { productId: existing.productId },
    after: { productId: compartment.productId },
  });

  return compartment;
}

/**
 * Get active compartments count
 */
export async function getActiveCompartmentsCount(): Promise<number> {
  return prisma.compartment.count({
    where: { active: true },
  });
}

/**
 * Get disabled (maintenance) compartments count
 */
export async function getDisabledCompartmentsCount(): Promise<number> {
  return prisma.compartment.count({
    where: { active: false },
  });
}

/**
 * Get compartments in maintenance
 */
export async function getMaintenanceCompartments(): Promise<CompartmentWithRelations[]> {
  const compartments = await prisma.compartment.findMany({
    where: { active: false },
    include: {
      locker: true,
      product: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return compartments as CompartmentWithRelations[];
}
