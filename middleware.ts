import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // grove_session is a presence flag set by the frontend JS after login/signup.
  // The actual JWT lives in __Host-access which is httpOnly and scoped to the API
  // domain — middleware running on the frontend domain cannot read it.
  const hasSession =
    req.cookies.get('grove_session')?.value ||
    req.cookies.get('__Host-access')?.value || // works in local dev (same origin)
    req.cookies.get('access')?.value;

  if (!hasSession) {
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
