"use server";

import { Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import {
	categoryCreateSchema,
	categoryUpdateSchema,
	createCategory,
	updateCategory,
	moveCategory,
	deleteCategory,
} from "@/lib/admin/categories";

export async function createCategoryAction(input: z.infer<typeof categoryCreateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "category.create", limit: 30 },
	});
	const parsed = categoryCreateSchema.parse(input);
	return createCategory(ctx, parsed);
}

export async function updateCategoryAction(input: z.infer<typeof categoryUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "category.update", limit: 60 },
	});
	const parsed = categoryUpdateSchema.parse(input);
	return updateCategory(ctx, parsed);
}

export async function moveCategoryAction(input: { id: string; direction: "up" | "down" }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "category.reorder", limit: 120 },
	});
	return moveCategory(ctx, input.id, input.direction);
}

export async function deleteCategoryAction(input: { id: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "category.delete", limit: 20 },
	});
	return deleteCategory(ctx, input.id);
}

