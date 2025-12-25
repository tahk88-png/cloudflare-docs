import { redirect } from "next/navigation";

import { isAdminRequest } from "@/lib/auth";
import { getBookingRiskCounts } from "@/lib/repos/bookings";

function Card(props: { title: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/70">{props.title}</div>
      <div className="mt-2 text-3xl font-semibold">{props.value}</div>
      <div className="mt-1 text-xs text-white/50">{props.hint}</div>
    </div>
  );
}

export default async function AdminHomePage() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const counts = await getBookingRiskCounts();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card title="Overdue" value={counts.overdue} hint="Active bookings past end time" />
        <Card title="Open failed" value={counts.open_failed} hint="Bookings with locker.open_failed (24h)" />
        <Card title="Payment pending" value={counts.payment_pending} hint="Active bookings not paid" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Tip: webhook events can be posted to <code className="text-white">/api/events</code>; actions are logged to{" "}
        <code className="text-white">ai_actions</code>.
      </div>
    </div>
  );
}

