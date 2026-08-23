import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import { sendBalancePaymentEmail } from '@/lib/email';
import { SLOT_LABELS } from '@/lib/booking-types';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch booking
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Calculate remaining balance
    // total_price - deposit_amount
    const depositPaid = booking.deposit_amount || 0;
    const remainingBalanceGhs = booking.total_price - depositPaid;

    if (remainingBalanceGhs <= 0) {
      return NextResponse.json({ error: 'This shoot has no remaining balance due' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin || 'https://bynk-gh.vercel.app';
    const callbackUrl = `${origin}/book?status=payment_complete&bookingId=${bookingId}`;

    // Initialize Paystack transaction for the exact remaining balance
    const paystackResult = await initializePaystackTransaction({
      email: booking.email,
      amountInGhs: booking.total_price,
      exactAmountInGhs: remainingBalanceGhs,
      bookingId: `${booking.id}_balance`,
      callbackUrl,
      metadata: {
        booking_id: booking.id,
        payment_type: 'remaining_balance',
      },
    });

    if (!paystackResult.success || !paystackResult.authorizationUrl) {
      return NextResponse.json({ error: paystackResult.error || 'Failed to generate Paystack link' }, { status: 500 });
    }

    const [y, m, d] = booking.date.split('-').map(Number);
    const formattedShootDate = new Date(y, m - 1, d).toDateString();
    const timeSlotLabel = booking.full_day
      ? 'Full Day'
      : SLOT_LABELS[booking.slot as keyof typeof SLOT_LABELS] || booking.slot;

    // Send payment email to client
    const emailResult = await sendBalancePaymentEmail({
      toEmail: booking.email,
      clientName: booking.name,
      categoryLabel: booking.category,
      tierName: booking.tier,
      shootDate: formattedShootDate,
      timeSlotLabel,
      remainingBalanceGhs,
      paystackAuthorizationUrl: paystackResult.authorizationUrl,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Balance payment email sent to ${booking.email}`,
      authorizationUrl: paystackResult.authorizationUrl,
      simulated: emailResult.simulated,
    });
  } catch (err: any) {
    console.error('Send payment email error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
