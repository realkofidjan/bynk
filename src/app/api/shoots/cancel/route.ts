import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

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

    // Calculate add-ons cost vs deposit
    // Base package = total_price - add_ons_total (or estimated)
    const depositPaid = booking.deposit_amount || 0;
    
    // Add-on refund calculation
    let addOnRefundGhs = 0;
    if (isEligibleForAddOnRefund && booking.add_ons && booking.add_ons.length > 0) {
      // Add-ons were paid 100% upfront
      // Base deposit was 50% of base price
      // addOnRefundGhs = depositPaid - (50% of base price)
      // or estimated from total_price
      addOnRefundGhs = Math.max(0, depositPaid - Math.round((booking.total_price - depositPaid) / 1));
    }

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
      clientName: booking.name,
      phone: booking.phone,
      shootDate: booking.date,
    });
  } catch (err: any) {
    console.error('Cancel shoot API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
