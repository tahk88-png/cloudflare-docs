import { Role } from "@prisma/client";

import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/sonner";
import { requireRole } from "@/lib/auth/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await requireRole([Role.owner, Role.admin, Role.operator, Role.viewer]);

	return (
		<>
			<AdminShell
				user={{
					name: user.name ?? null,
					email: user.email ?? null,
					role: user.role,
				}}
			>
				{children}
			</AdminShell>
			<Toaster />
		</>
	);
}

