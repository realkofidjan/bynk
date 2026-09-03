import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'bynk_admin';

/**
 * Recomputes the expected admin token using Web Crypto API (Edge-compatible).
 */
async function computeExpectedToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'bynk-admin-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Routes that require admin authentication */
const PROTECTED_PAGE_PREFIXES = ['/upload', '/shoots'];
const PROTECTED_API_PREFIXES = ['/api/upload', '/api/shoots'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no ADMIN_PASSWORD is set, allow access (dev convenience — set it in production!)
  if (!adminPassword) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return denyAccess(request, isProtectedApi);
  }

  const expectedToken = await computeExpectedToken(adminPassword);
  if (cookie !== expectedToken) {
    return denyAccess(request, isProtectedApi);
  }

  return NextResponse.next();
}

function denyAccess(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json({ error: 'Unauthorized — admin login required' }, { status: 401 });
  }

  const loginUrl = new URL('/admin', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/upload/:path*', '/shoots/:path*', '/api/upload/:path*', '/api/shoots/:path*'],
};
