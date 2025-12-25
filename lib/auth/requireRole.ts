import "server-only";

import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";

export class AdminAuthError extends Error {
	code: "UNAUTHENTICATED" | "FORBIDDEN";
	constructor(code: AdminAuthError["code"], message: string) {
		super(message);
		this.code = code;
	}
}

export type SessionUser = {
	id: string;
	email?: string | null;
	name?: string | null;
	role: Role;
	active: boolean;
};

export function roleRank(role: Role): number {
	switch (role) {
		case Role.owner:
			return 4;
		case Role.admin:
			return 3;
		case Role.operator:
			return 2;
		case Role.viewer:
			return 1;
		default:
			return 0;
	}
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
	const session = await getServerSession(authOptions);
	const user = session?.user as any;

	if (!user?.id) throw new AdminAuthError("UNAUTHENTICATED", "Sign-in required.");
	if (!user.active) throw new AdminAuthError("FORBIDDEN", "User is inactive.");

	const ok = allowed.includes(user.role);
	if (!ok) throw new AdminAuthError("FORBIDDEN", "Insufficient role.");

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		active: user.active,
	};
}

export async function getRequestIp(): Promise<string | undefined> {
	const h = await headers();
	return (
		h.get("cf-connecting-ip") ??
		h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		undefined
	);
}

