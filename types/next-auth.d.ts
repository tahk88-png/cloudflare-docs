import "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
	interface Session {
		user?: {
			id: string;
			role: Role;
			active: boolean;
			name?: string | null;
			email?: string | null;
		};
	}
}

