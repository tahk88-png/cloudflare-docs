"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validations";
import { getUserByEmail, updateLastLogin } from "@/lib/admin/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { logAccessAttempt, logSecurityEvent } from "@/lib/auth/logging";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";
import type { ApiResponse } from "@/lib/types";

export async function loginAction(
  formData: FormData
): Promise<ApiResponse<{ redirect: string }>> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  // Rate limit check
  const { limited } = await checkRateLimit(ip, "/login", 5);
  if (limited) {
    await logSecurityEvent("rate_limit_login", { ip });
    return {
      success: false,
      error: "Too many login attempts. Please try again later.",
    };
  }

  // Validate input
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;

  // Find user
  const user = await getUserByEmail(email);
  if (!user) {
    await logAccessAttempt({
      success: false,
      reason: "User not found",
      ip,
      userAgent,
      path: "/login",
    });
    return {
      success: false,
      error: "Invalid email or password",
    };
  }

  // Check if user is active
  if (!user.active) {
    await logAccessAttempt({
      success: false,
      userId: user.id,
      reason: "Account deactivated",
      ip,
      userAgent,
      path: "/login",
    });
    return {
      success: false,
      error: "Your account has been deactivated. Please contact an administrator.",
    };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await logAccessAttempt({
      success: false,
      userId: user.id,
      reason: "Invalid password",
      ip,
      userAgent,
      path: "/login",
    });
    return {
      success: false,
      error: "Invalid email or password",
    };
  }

  // Create session
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  // Update last login
  await updateLastLogin(user.id);

  await logAccessAttempt({
    success: true,
    userId: user.id,
    ip,
    userAgent,
    path: "/login",
  });

  return {
    success: true,
    data: { redirect: "/admin" },
  };
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
