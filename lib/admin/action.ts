import "server-only";

import { Role } from "@prisma/client";

import { assertSameOrigin } from "@/lib/auth/csrf";
import { getRequestIp, requireRole, type SessionUser } from "@/lib/auth/requireRole";
import { enforceRateLimit } from "@/lib/admin/rateLimit";

export type AdminContext = {
	actor: SessionUser;
	ip?: string;
};

export async function adminContext(opts: {
	roles: Role[];
	rateLimit?: { key: string; limit: number };
	csrfCheck?: boolean;
}): Promise<AdminContext> {
	if (opts.csrfCheck !== false) {
		await assertSameOrigin();
	}

	const actor = await requireRole(opts.roles);
	const ip = await getRequestIp();

	if (opts.rateLimit) {
		// Keyed per user and action; falls back to ip.
		const key = `u:${actor.id}:${opts.rateLimit.key}:${ip ?? "noip"}`;
		await enforceRateLimit({ key, limit: opts.rateLimit.limit });
	}

	return { actor, ip };
}

