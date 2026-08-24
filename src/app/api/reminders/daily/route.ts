import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import { sendBalancePaymentEmail } from '@/lib/email';
import { SLOT_LABELS, toDateKey } from '@/lib/booking-types';

export async function GET(request: NextRequest) {
  try {
    // Optional secret verification for Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron invocation attempt');
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = toDateKey(tomorrow);

    const supabase = createServerSupabase();

    // Query confirmed bookings scheduled for tomorrow
    const { data: upcomingBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', tomorrowDateStr)
      .eq('status', 'confirmed');

    if (fetchErr) {
      console.error('Supabase query error in daily reminder cron:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch tomorrow shoots' }, { status: 500 });
    }

    const origin = request.headers.get('origin') || 'https://bynk-gh.vercel.app';
    const results = [];

    for (const booking of upcomingBookings || []) {
      const depositPaid =
        booking.deposit_amount && booking.deposit_amount > 0
          ? booking.deposit_amount
          : Math.round(booking.total_price / 2);
      const remainingBalanceGhs = Math.max(0, booking.total_price - depositPaid);

      // Skip if balance is already 0
      if (remainingBalanceGhs <= 0) continue;

      const callbackUrl = `${origin}/book?status=payment_complete&bookingId=${booking.id}`;

      // Initialize Paystack balance transaction link
      const paystackResult = await initializePaystackTransaction({
        email: booking.email,
        amountInGhs: booking.total_price,
        exactAmountInGhs: remainingBalanceGhs,
        bookingId: `${booking.id}_auto_remind`,
        callbackUrl,
        metadata: {
          booking_id: booking.id,
          reminder_type: '1_day_before',
        },
      });

      if (paystackResult.success && paystackResult.authorizationUrl) {
        const [y, m, d] = booking.date.split('-').map(Number);
        const formattedDate = new Date(y, m - 1, d).toDateString();
        const timeSlotLabel = booking.full_day
          ? 'Full Day'
          : SLOT_LABELS[booking.slot as keyof typeof SLOT_LABELS] || booking.slot;

        // Send payment reminder email
        const emailResult = await sendBalancePaymentEmail({
          toEmail: booking.email,
          clientName: booking.name,
          categoryLabel: booking.category,
          tierName: booking.tier,
          shootDate: formattedDate,
          timeSlotLabel,
          remainingBalanceGhs,
          paystackAuthorizationUrl: paystackResult.authorizationUrl,
        });

        results.push({
          bookingId: booking.id,
          clientName: booking.name,
          email: booking.email,
          emailSent: emailResult.success,
          simulated: emailResult.simulated,
        });
      }
    }

    return NextResponse.json({
      success: true,
      targetDate: tomorrowDateStr,
      processedCount: results.length,
      results,
    });
  } catch (err: any) {
    console.error('Daily reminder cron error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
