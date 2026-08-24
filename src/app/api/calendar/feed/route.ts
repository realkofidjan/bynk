import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { type Booking } from '@/lib/booking-types';
import { createIcsContent } from '@/lib/ics-calendar';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();

    // Query all confirmed and pending active bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['pending', 'confirmed'])
      .order('date', { ascending: true });

    if (error) {
      console.error('Supabase query error in calendar feed:', error);
      return new NextResponse('Failed to fetch schedule feed', { status: 500 });
    }

    const icsContent = createIcsContent((bookings as Booking[]) || [], false);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="BYNK_Schedule.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Calendar feed error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
