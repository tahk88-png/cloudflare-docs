import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { json } from "@/lib/http";
import { searchAiActions } from "@/lib/repos/ai-actions";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const actions = await searchAiActions({ q });
  return json({ ok: true, actions });
}

