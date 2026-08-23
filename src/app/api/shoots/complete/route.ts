import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Mark status as completed in Supabase
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Failed to mark shoot as completed:', updateErr);
      return NextResponse.json({ error: 'Failed to update shoot status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: 'completed',
    });
  } catch (err: any) {
    console.error('Complete shoot API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
