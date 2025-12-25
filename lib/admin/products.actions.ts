"use server";

import { Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import {
	productCreateSchema,
	productUpdateSchema,
	createProduct,
	updateProduct,
	deleteProduct,
} from "@/lib/admin/products";

export async function createProductAction(input: z.infer<typeof productCreateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "product.create", limit: 30 },
	});
	return createProduct(ctx, productCreateSchema.parse(input));
}

export async function updateProductAction(input: z.infer<typeof productUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "product.update", limit: 60 },
	});
	return updateProduct(ctx, productUpdateSchema.parse(input));
}

export async function deleteProductAction(input: { id: string }) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "product.delete", limit: 10 },
	});
	return deleteProduct(ctx, input.id);
}

