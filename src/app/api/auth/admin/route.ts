import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'bynk_admin';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function hashAdminToken(password: string): string {
  return createHash('sha256').update(password + 'bynk-admin-salt-v1').digest('hex');
}

/**
 * POST /api/auth/admin — Login
 * Body: { password: string }
 * Sets an HTTP-only cookie on success.
 */
export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD environment variable is not set' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = (body.password || '').trim();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = hashAdminToken(adminPassword);
    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/admin — Logout
 * Clears the admin cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
