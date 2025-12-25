import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdminRequest } from "@/lib/auth";
import { listTickets } from "@/lib/repos/tickets";

export default async function AdminTicketsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const sp = await props.searchParams;
  const status = sp.status as any;
  const tickets = await listTickets({ status });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-white/70">
          Tickets ({tickets.length})
        </div>
        <div className="flex gap-2 text-xs text-white/70">
          {["open", "in_progress", "resolved", "closed"].map((s) => (
            <Link
              key={s}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 underline"
              href={`/admin/tickets?status=${s}`}
            >
              {s}
            </Link>
          ))}
          <Link className="rounded-full border border-white/10 bg-white/5 px-3 py-1 underline" href="/admin/tickets">
            all
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-white/10">
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.category}</td>
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2 text-xs text-white/60">{t.booking_id ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-white/60">
                  {new Date(t.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {tickets.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-white/60" colSpan={5}>
                  No tickets found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

