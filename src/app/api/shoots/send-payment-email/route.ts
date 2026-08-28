import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import { sendBalancePaymentEmail } from '@/lib/email';
import { SLOT_LABELS, calculateBookingFinancials } from '@/lib/booking-types';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, paymentType = 'balance', sendEmail = false } = await request.json();

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

    // Calculate financial figures with exact rule: (50% base package + 100% add-ons)
    const financials = calculateBookingFinancials({
      total_price: Number(booking.total_price) || 0,
      add_ons: booking.add_ons || [],
    });

    const totalPrice = Number(booking.total_price) || 0;
    const initialDepositGhs = financials.depositPaid;
    const remainingBalanceGhs = financials.remainingBalance;

    // Determine charge amount based on paymentType requested
    let chargeAmountGhs = 0;
    let paymentTypeLabel = '';

    if (paymentType === 'full') {
      chargeAmountGhs = totalPrice;
      paymentTypeLabel = 'Full Payment (100%)';
    } else if (paymentType === 'deposit') {
      chargeAmountGhs = initialDepositGhs;
      paymentTypeLabel = 'Initial Deposit (50% Base + 100% Add-ons)';
    } else {
      chargeAmountGhs = remainingBalanceGhs > 0 ? remainingBalanceGhs : totalPrice;
      paymentTypeLabel = 'Remaining Balance (50% Base)';
    }

    if (chargeAmountGhs <= 0) {
      return NextResponse.json({ error: 'Charge amount must be greater than zero' }, { status: 400 });
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;
    const callbackUrl = `${origin}/book?status=payment_complete&bookingId=${bookingId}`;

    // Initialize Paystack transaction for the exact selected amount (with fee incurred by client)
    const paystackResult = await initializePaystackTransaction({
      email: booking.email,
      clientName: booking.name,
      amountInGhs: totalPrice,
      exactAmountInGhs: chargeAmountGhs,
      bookingId: `${booking.id}_${paymentType}`,
      callbackUrl,
      metadata: {
        booking_id: booking.id,
        category: booking.category,
        tier: booking.tier,
        payment_type: paymentType,
      },
    });

    if (!paystackResult.success || !paystackResult.authorizationUrl) {
      return NextResponse.json({ error: paystackResult.error || 'Failed to generate Paystack link' }, { status: 500 });
    }

    const [y, m, d] = (booking.date || '').split('-').map(Number);
    const formattedShootDate = booking.date ? new Date(y, m - 1, d).toDateString() : '';
    const timeSlotLabel = booking.full_day
      ? 'Full Day'
      : SLOT_LABELS[booking.slot as keyof typeof SLOT_LABELS] || booking.slot;

    // Send payment email to client if requested
    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail) {
      const emailResult = await sendBalancePaymentEmail({
        toEmail: booking.email,
        clientName: booking.name,
        categoryLabel: booking.category,
        tierName: booking.tier,
        shootDate: formattedShootDate,
        timeSlotLabel,
        remainingBalanceGhs: chargeAmountGhs,
        paystackAuthorizationUrl: paystackResult.authorizationUrl,
      });

      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${paymentTypeLabel} link generated for ${booking.name}`,
      authorizationUrl: paystackResult.authorizationUrl,
      chargeAmountGhs,
      grossGhs: paystackResult.grossGhs,
      feeGhs: paystackResult.feeGhs,
      paymentType,
      paymentTypeLabel,
      booking,
      emailSent,
      emailError,
    });
  } catch (err: any) {
    console.error('Send payment email error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
