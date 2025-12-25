import { AdminShell } from '@/components/admin/AdminShell';
import { requireAuth } from '@/lib/auth/requireRole';

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireAuth();

	return <AdminShell>{children}</AdminShell>;
}
