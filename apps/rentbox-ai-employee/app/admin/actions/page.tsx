import { redirect } from "next/navigation";

import { isAdminRequest } from "@/lib/auth";
import { searchAiActions } from "@/lib/repos/ai-actions";

export default async function AdminActionsPage(props: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const sp = await props.searchParams;
  const q = sp.q ?? "";
  const actions = await searchAiActions({ q: q || undefined });

  return (
    <div className="space-y-4">
      <form className="flex gap-2" action="/admin/actions" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search action_type / reason / outcome…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
        />
        <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black">Search</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-t border-white/10 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-white/60">
                  {new Date(a.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{a.action_type}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2 text-white/70">{a.reason ?? "—"}</td>
                <td className="px-3 py-2 text-white/70">{a.outcome ?? "—"}</td>
              </tr>
            ))}
            {actions.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-white/60" colSpan={5}>
                  No actions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

