import { NextRequest, NextResponse } from 'next/server';
import { getShootByPasscodeAsync } from '@/lib/shoots';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const passcode = (body.passcode || '').trim();

    if (!passcode) {
      return NextResponse.json({ success: false, error: 'Passcode is required' }, { status: 400 });
    }

    const shoot = await getShootByPasscodeAsync(passcode);

    if (shoot) {
      return NextResponse.json({ success: true, shoot });
    }

    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 404 });
  } catch (err: any) {
    console.error('API verify gallery error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passcode = (searchParams.get('code') || searchParams.get('passcode') || '').trim();

    if (!passcode) {
      return NextResponse.json({ success: false, error: 'Passcode is required' }, { status: 400 });
    }

    const shoot = await getShootByPasscodeAsync(passcode);

    if (shoot) {
      return NextResponse.json({ success: true, shoot });
    }

    return NextResponse.json({ success: false, error: 'Invalid passcode' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
