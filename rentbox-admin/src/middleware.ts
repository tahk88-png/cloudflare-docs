import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-change-in-production"
);
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "rentbox_session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

// Admin routes - all require authentication
const ADMIN_ROUTES_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow static files and API routes for auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  
  // Check authentication for admin routes
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX) || pathname === "/") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Check if user is active (role exists in payload)
      if (!payload.user || typeof payload.user !== "object") {
        throw new Error("Invalid token payload");
      }
      
      // Add user info to headers for server components
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", (payload.user as { id: string }).id);
      requestHeaders.set("x-user-role", (payload.user as { role: string }).role);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      // Invalid or expired token
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
