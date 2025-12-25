"use server";

import { Role } from "@prisma/client";
import { z } from "zod";

import { adminContext } from "@/lib/admin/action";
import { settingsUpdateSchema, updateSettings } from "@/lib/admin/settings";

export async function updateSettingsAction(input: z.infer<typeof settingsUpdateSchema>) {
	const ctx = await adminContext({
		roles: [Role.owner, Role.admin],
		rateLimit: { key: "settings.update", limit: 20 },
	});
	return updateSettings(ctx, settingsUpdateSchema.parse(input));
}

