import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold">Admin Console</div>
            <div className="text-xs text-white/60">Rentbox AI Employee v1.0</div>
          </div>
          <nav className="flex gap-3 text-sm text-white/80">
            <Link className="underline" href="/admin">
              Risk
            </Link>
            <Link className="underline" href="/admin/tickets">
              Tickets
            </Link>
            <Link className="underline" href="/admin/actions">
              AI actions
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

