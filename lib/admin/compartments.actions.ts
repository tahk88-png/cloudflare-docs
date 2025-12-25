"use server";

import { Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import {
	compartmentCreateSchema,
	compartmentUpdateSchema,
	createCompartment,
	updateCompartment,
	setCompartmentMaintenance,
	clearCompartmentMaintenance,
} from "@/lib/admin/compartments";

export async function createCompartmentAction(input: z.infer<typeof compartmentCreateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "compartment.create", limit: 60 },
	});
	return createCompartment(ctx, compartmentCreateSchema.parse(input));
}

export async function updateCompartmentAction(input: z.infer<typeof compartmentUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "compartment.update", limit: 120 },
	});
	return updateCompartment(ctx, compartmentUpdateSchema.parse(input));
}

export async function setCompartmentMaintenanceAction(input: { id: string; notes: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin, Role.operator],
		rateLimit: { key: "compartment.maintenance", limit: 120 },
	});
	return setCompartmentMaintenance(ctx, input);
}

export async function clearCompartmentMaintenanceAction(input: { id: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin, Role.operator],
		rateLimit: { key: "compartment.maintenance_clear", limit: 120 },
	});
	return clearCompartmentMaintenance(ctx, input);
}

