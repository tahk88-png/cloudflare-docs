import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function logAccess(req: NextRequest, outcome: "allow" | "deny", reason?: string) {
	const ip =
		req.headers.get("cf-connecting-ip") ??
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"unknown";
	console.info(
		`[admin-access] ${outcome} ip=${ip} path=${req.nextUrl.pathname}${
			reason ? ` reason=${reason}` : ""
		}`,
	);
}

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	if (!pathname.startsWith("/admin")) return NextResponse.next();

	// Allow auth endpoints and sign-in page.
	if (
		pathname.startsWith("/admin/login") ||
		pathname.startsWith("/api/auth") ||
		pathname.startsWith("/admin/api/auth")
	) {
		return NextResponse.next();
	}

	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
	if (!token?.sub) {
		logAccess(req, "deny", "no_session");
		const url = req.nextUrl.clone();
		url.pathname = "/admin/login";
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	if ((token as any).active === false) {
		logAccess(req, "deny", "inactive");
		const url = req.nextUrl.clone();
		url.pathname = "/admin/login";
		return NextResponse.redirect(url);
	}

	logAccess(req, "allow");
	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*"],
};

