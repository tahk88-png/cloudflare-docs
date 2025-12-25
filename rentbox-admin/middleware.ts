import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData } from './lib/auth/session';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const ADMIN_PATH_PREFIX = '/admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Protect admin routes
  if (pathname.startsWith(ADMIN_PATH_PREFIX)) {
    const response = NextResponse.next();
    
    const session = await getIronSession<SessionData>(request, response, {
      password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
      cookieName: 'rentbox_admin_session',
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    });

    // Redirect to login if not authenticated
    if (!session.isLoggedIn || !session.userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/login',
  ],
};
