import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      settlementType = 'balance', // 'balance' | 'full' | 'none'
      paymentMethod = 'cash', // 'cash' | 'momo' | 'bank_transfer' | 'none'
      amountPaid = 0,
      notes = '',
    } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch existing booking
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: fetchErr?.message || 'Booking not found' }, { status: 404 });
    }

    // Compute past date key (yesterday) so shoot moves to the Completed tab
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const cleanTier = (booking.tier || '').replace(/\s*\[Completed.*?\]/g, '').trim();
    const updatedTier = `${cleanTier} [Completed]`;
    const settlementNote = `Completed: ${settlementType === 'full' ? 'Full fee' : settlementType === 'balance' ? 'Remaining balance' : 'Session'} settled offline via ${paymentMethod}${notes ? ` — "${notes}"` : ''}`;

    const existingAddOns = Array.isArray(booking.add_ons) ? booking.add_ons : [];
    const filteredAddOns = existingAddOns.filter((a: string) => !String(a).startsWith('Completed:'));
    const updatedAddOns = [...filteredAddOns, settlementNote];

    // Update payload with valid status in DB constraint ('confirmed')
    const updatePayload: Record<string, any> = {
      status: 'confirmed',
      date: yesterdayStr,
      tier: updatedTier,
      add_ons: updatedAddOns,
    };

    const { error: updateErr } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Failed to mark shoot as completed:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to update shoot status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: 'confirmed',
      settlementType,
      paymentMethod,
      amountPaid,
      notes,
    });
  } catch (err: any) {
    console.error('Complete shoot API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
