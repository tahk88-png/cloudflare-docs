import "server-only";

import { prisma } from "@/lib/db/prisma";

export class RateLimitError extends Error {
	constructor(message = "Too many requests.") {
		super(message);
	}
}

type RateLimitInput = {
	key: string;
	limit: number;
	windowMs?: number;
};

export async function enforceRateLimit({
	key,
	limit,
	windowMs = 60_000,
}: RateLimitInput) {
	const now = Date.now();
	const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

	const row = await prisma.adminRateLimit.upsert({
		where: { key_windowStart: { key, windowStart } },
		update: { count: { increment: 1 } },
		create: { key, windowStart, count: 1 },
	});

	if (row.count > limit) {
		throw new RateLimitError();
	}
}

