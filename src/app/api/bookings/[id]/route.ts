import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    let query = supabase.from('bookings').select('*');
    if (id.startsWith('BYNK_')) {
      query = query.eq('paystack_reference', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Auto-update status to confirmed if payment succeeded and booking is pending
    if (booking.status === 'pending') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);
      booking.status = 'confirmed';
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('Booking GET by ID error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
