import { json } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getBookingRiskCounts } from "@/lib/repos/bookings";

export async function GET() {
  await requireAdmin();
  const counts = await getBookingRiskCounts();
  return json({ ok: true, counts });
}

