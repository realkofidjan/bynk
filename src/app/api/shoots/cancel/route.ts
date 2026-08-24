import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { calculateBookingFinancials } from '@/lib/booking-types';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, reason } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch booking details
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Shoot is already cancelled' }, { status: 400 });
    }

    // Check cancellation deadline (2 days / 48 hours before shoot date)
    const [y, m, d] = booking.date.split('-').map(Number);
    const shootDateObj = new Date(y, m - 1, d);
    shootDateObj.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = shootDateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isEligibleForAddOnRefund = diffDays >= 2;

    // Calculate add-ons cost using financial calculator
    const { addOnsTotal } = calculateBookingFinancials({
      total_price: booking.total_price || 0,
      add_ons: booking.add_ons || [],
    });

    const addOnRefundGhs = isEligibleForAddOnRefund ? addOnsTotal : 0;

    // Mark as cancelled in Supabase
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Failed to update booking status to cancelled:', updateErr);
      return NextResponse.json({ error: 'Failed to cancel booking in database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: 'cancelled',
      diffDays,
      isEligibleForAddOnRefund,
      addOnsTotal,
      addOnRefundGhs,
      clientName: booking.name,
      phone: booking.phone,
      shootDate: booking.date,
    });
  } catch (err: any) {
    console.error('Cancel shoot API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
