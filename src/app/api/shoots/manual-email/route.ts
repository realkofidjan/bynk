import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import {
  sendBalancePaymentEmail,
  sendBookingConfirmationEmail,
  sendManualShootEmail,
} from '@/lib/email';
import { SLOT_LABELS, calculateBookingFinancials } from '@/lib/booking-types';

export async function POST(request: NextRequest) {
  try {
    const {
      bookingId,
      emailType = 'payment_reminder', // 'payment_reminder' | 'booking_confirmation' | 'custom_message'
      paymentType = 'balance',       // 'balance' | 'deposit' | 'full'
      customSubject,
      customMessage,
    } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 });
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

    if (!booking.email) {
      return NextResponse.json({ error: 'This booking has no email address associated with it' }, { status: 400 });
    }

    // Format date & time slot
    const [y, m, d] = (booking.date || '').split('-').map(Number);
    const formattedShootDate = booking.date ? new Date(y, m - 1, d).toDateString() : 'Upcoming Date';
    const timeSlotLabel = booking.full_day
      ? 'Full Day'
      : SLOT_LABELS[booking.slot as keyof typeof SLOT_LABELS] || booking.slot || 'Scheduled Slot';

    // Financial calculations
    const financials = calculateBookingFinancials({
      total_price: Number(booking.total_price) || 0,
      add_ons: booking.add_ons || [],
    });

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    // 1. PAYMENT REMINDER EMAIL (Deposit, Remaining Balance, or Full Payment)
    if (emailType === 'payment_reminder') {
      let chargeAmountGhs = 0;
      let paymentTypeLabel = 'Remaining Balance';

      if (paymentType === 'full') {
        chargeAmountGhs = Number(booking.total_price) || 0;
        paymentTypeLabel = 'Full Payment (100%)';
      } else if (paymentType === 'deposit') {
        chargeAmountGhs = financials.depositPaid;
        paymentTypeLabel = 'Initial Deposit (50% Base + 100% Add-ons)';
      } else {
        chargeAmountGhs = financials.remainingBalance > 0 ? financials.remainingBalance : Number(booking.total_price) || 0;
        paymentTypeLabel = 'Remaining Balance (50% Base)';
      }

      if (chargeAmountGhs <= 0) {
        return NextResponse.json(
          { error: 'Charge amount must be greater than zero. Booking has no remaining balance due.' },
          { status: 400 }
        );
      }

      const checkoutUrl = `${origin}/checkout/${bookingId}?type=${paymentType}`;

      const emailResult = await sendBalancePaymentEmail({
        toEmail: booking.email,
        clientName: booking.name,
        categoryLabel: booking.category,
        tierName: booking.tier,
        shootDate: formattedShootDate,
        timeSlotLabel,
        remainingBalanceGhs: chargeAmountGhs,
        paystackAuthorizationUrl: checkoutUrl,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          {
            error: emailResult.error || 'Failed to deliver email through provider',
            authorizationUrl: checkoutUrl,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${paymentTypeLabel} email sent to ${booking.email} with bespoke checkout link!`,
        provider: emailResult.provider,
        authorizationUrl: checkoutUrl,
        chargeAmountGhs,
      });
    }

    // 2. BOOKING CONFIRMATION EMAIL (Resend official confirmation receipt)
    if (emailType === 'booking_confirmation') {
      const shortRef = booking.id ? booking.id.slice(0, 8).toUpperCase() : 'BYNK';
      const lookupUrl = `${origin}/book/lookup`;

      const emailResult = await sendBookingConfirmationEmail({
        toEmail: booking.email,
        clientName: booking.name,
        bookingRef: shortRef,
        categoryLabel: booking.category,
        tierName: booking.tier,
        shootDate: formattedShootDate,
        timeSlotLabel,
        depositPaidGhs: financials.depositPaid,
        totalPriceGhs: Number(booking.total_price) || 0,
        remainingBalanceGhs: financials.remainingBalance,
        lookupUrl,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to deliver booking confirmation email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Booking confirmation receipt resent to ${booking.email}!`,
        provider: emailResult.provider,
      });
    }

    // 3. CUSTOM MESSAGE / SHOOT UPDATE EMAIL
    if (emailType === 'custom_message') {
      if (!customSubject?.trim()) {
        return NextResponse.json({ error: 'Please provide an email subject' }, { status: 400 });
      }
      if (!customMessage?.trim()) {
        return NextResponse.json({ error: 'Please provide a message body' }, { status: 400 });
      }

      const emailResult = await sendManualShootEmail({
        toEmail: booking.email,
        clientName: booking.name,
        shootDate: formattedShootDate,
        tierName: booking.tier,
        categoryLabel: booking.category,
        subject: customSubject.trim(),
        message: customMessage.trim(),
        actionUrl: `${origin}/book/lookup`,
        actionText: 'View Shoot Details',
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to send custom shoot email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Custom email sent to ${booking.email}!`,
        provider: emailResult.provider,
      });
    }

    return NextResponse.json({ error: `Unknown emailType: ${emailType}` }, { status: 400 });
  } catch (err: any) {
    console.error('Manual email error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing manual email' },
      { status: 500 }
    );
  }
}
