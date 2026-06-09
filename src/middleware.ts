import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that never require authentication
const PUBLIC = new Set([
  '/',
  '/auth',
  '/verify',
  '/forgot',
  '/callback',
  '/verify-email',
  '/reset-password',
  '/legal',
  '/subscribe',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (PUBLIC.has(pathname)) return NextResponse.next();

  // Allow static/api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check for access cookie — the backend sets __Host-access (httpOnly)
  // In production (HTTPS) this is __Host-access; in dev it may be plain 'access'
  const accessCookie =
    req.cookies.get('__Host-access')?.value ||
    req.cookies.get('access')?.value;

  if (!accessCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
