import { AdminLoginClient } from "@/components/AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Admin Sign-in</h1>
          <p className="text-sm text-white/70">This is a lightweight key-based login for v1.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <AdminLoginClient />
        </div>
      </div>
    </main>
  );
}

