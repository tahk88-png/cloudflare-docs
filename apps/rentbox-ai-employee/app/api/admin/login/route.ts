import { NextRequest } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { json } from "@/lib/http";

const Schema = z.object({ key: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  if (parsed.data.key !== env().ADMIN_API_KEY) return json({ error: "unauthorized" }, 401);

  const res = json({ ok: true });
  res.cookies.set("rb_admin", env().ADMIN_API_KEY, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}

