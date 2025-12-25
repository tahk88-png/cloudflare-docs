import { cookies, headers } from "next/headers";
import { env } from "./env";

export async function isAdminRequest(): Promise<boolean> {
  const h = await headers();
  const key = h.get("x-admin-key") ?? "";
  if (key && key === env().ADMIN_API_KEY) return true;
  const c = await cookies();
  return c.get("rb_admin")?.value === env().ADMIN_API_KEY;
}

export async function requireAdmin() {
  if (!(await isAdminRequest())) {
    const e = new Error("Unauthorized");
    (e as any).statusCode = 401;
    throw e;
  }
}

export function allowedWidgetOrigin(origin: string | null): boolean {
  if (!origin) return true; // non-browser / same-origin
  const allowed = env().ALLOWED_WIDGET_ORIGINS;
  if (!allowed) return true;
  const list = allowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin);
}

