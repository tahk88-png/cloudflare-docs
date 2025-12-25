import { SidebarNav } from "@/components/admin/SidebarNav";
import { requireRole, Role } from "@/lib/auth/requireRole";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([Role.OWNER, Role.ADMIN, Role.OPERATOR, Role.VIEWER]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 flex-col border-r bg-muted/40 p-6 md:flex">
        <div className="mb-6 flex items-center gap-2 font-bold text-lg text-primary">
          Rentbox Admin
        </div>
        <SidebarNav />
      </aside>
      <main className="flex-1 bg-background p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
