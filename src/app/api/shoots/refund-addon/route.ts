import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { calculateBookingFinancials } from '@/lib/booking-types';
import { refundPaystackTransaction } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 });
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

    // Calculate add-on refund eligibility
    const [y, m, d] = booking.date.split('-').map(Number);
    const shootDateObj = new Date(y, m - 1, d);
    shootDateObj.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((shootDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isEligible = diffDays >= 2;

    const { addOnsTotal } = calculateBookingFinancials({
      total_price: booking.total_price || 0,
      add_ons: booking.add_ons || [],
    });

    if (addOnsTotal <= 0) {
      return NextResponse.json({ error: 'This booking has no add-ons to refund' }, { status: 400 });
    }

    if (!isEligible) {
      return NextResponse.json(
        { error: 'Add-on refund is ineligible because notice was given less than 48 hours before shoot date' },
        { status: 400 }
      );
    }

    let paystackRefundResult = null;

    // Trigger automated refund via Paystack API if Paystack reference exists
    if (booking.paystack_reference) {
      paystackRefundResult = await refundPaystackTransaction({
        reference: booking.paystack_reference,
        amountInGhs: addOnsTotal,
        merchantNote: `BYNK Add-on refund for ${booking.name} (${booking.category})`,
      });

      if (!paystackRefundResult.success) {
        console.warn('Paystack automated refund warning:', paystackRefundResult.error);
      }
    }

    // Update status to cancelled in Supabase if not already cancelled
    if (booking.status !== 'cancelled') {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      refundAmount: addOnsTotal,
      diffDays,
      clientName: booking.name,
      phone: booking.phone,
      shootDate: booking.date,
      paystackRefunded: Boolean(paystackRefundResult?.success),
      paystackRefundId: paystackRefundResult?.refundId || null,
      paystackNotice: paystackRefundResult?.error || null,
      processedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('POST /api/shoots/refund-addon error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
