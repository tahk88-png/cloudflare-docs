import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	// Protect admin routes
	if (request.nextUrl.pathname.startsWith('/admin')) {
		// TODO: Implement actual authentication check
		// For now, allow access (replace with session/JWT check)
		// const session = await getSession(request);
		// if (!session) {
		//   return NextResponse.redirect(new URL('/admin/login', request.url));
		// }
	}

	return NextResponse.next();
}

export const config = {
	matcher: '/admin/:path*',
};
