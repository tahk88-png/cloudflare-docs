"use server";

import { Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import {
	lockerCreateSchema,
	lockerUpdateSchema,
	createLocker,
	updateLocker,
	deleteLocker,
} from "@/lib/admin/lockers";

export async function createLockerAction(input: z.infer<typeof lockerCreateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "locker.create", limit: 20 },
	});
	return createLocker(ctx, lockerCreateSchema.parse(input));
}

export async function updateLockerAction(input: z.infer<typeof lockerUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "locker.update", limit: 60 },
	});
	return updateLocker(ctx, lockerUpdateSchema.parse(input));
}

export async function deleteLockerAction(input: { id: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "locker.delete", limit: 10 },
	});
	return deleteLocker(ctx, input.id);
}

