import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supabase';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature || !PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
    }

    // Verify HMAC SHA512 signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.warn('Paystack webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Handle payment success event
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const metadata = data.metadata || {};
      const bookingId = metadata.booking_id;

      const supabase = createServerSupabase();

      let updatedBooking = null;
      let wasAlreadyConfirmed = false;

      if (bookingId) {
        // Check current status first to avoid double-processing
        const { data: existing } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('id', bookingId)
          .maybeSingle();

        if (existing?.status === 'confirmed') {
          wasAlreadyConfirmed = true;
          updatedBooking = existing;
        } else {
          const { data: b } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              paystack_reference: reference,
            })
            .eq('id', bookingId)
            .select('*')
            .single();
          updatedBooking = b;
        }
      } else if (reference) {
        const { data: existing } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('paystack_reference', reference)
          .maybeSingle();

        if (existing?.status === 'confirmed') {
          wasAlreadyConfirmed = true;
          updatedBooking = existing;
        } else {
          const { data: b } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
            })
            .eq('paystack_reference', reference)
            .select('*')
            .single();
          updatedBooking = b;
        }
      }

      // Only send confirmation email if the webhook actually transitioned the status
      // (i.e. the verify route didn't already handle it)
      if (!wasAlreadyConfirmed && updatedBooking && updatedBooking.email) {
        try {
          const { sendBookingConfirmationEmail } = await import('@/lib/email');
          const { calculateBookingFinancials, formatTimeLabel, getBookingStartTime, getBookingEndTime } = await import('@/lib/booking-types');

          const isFullDay = updatedBooking.full_day || updatedBooking.slot === 'full_day';
          const startTime = getBookingStartTime(updatedBooking);
          const endTime = getBookingEndTime(updatedBooking);
          const timeSlotLabel = isFullDay
            ? 'Full Day Coverage (9:00 AM – 5:00 PM)'
            : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

          const financials = calculateBookingFinancials({
            total_price: updatedBooking.total_price || 0,
            add_ons: updatedBooking.add_ons || [],
          });

          await sendBookingConfirmationEmail({
            toEmail: updatedBooking.email,
            clientName: updatedBooking.name || 'Client',
            bookingRef: updatedBooking.paystack_reference || updatedBooking.id,
            categoryLabel: (updatedBooking.category || 'Shoot').toUpperCase(),
            tierName: updatedBooking.tier || 'Package',
            shootDate: updatedBooking.date,
            timeSlotLabel,
            depositPaidGhs: financials.depositPaid,
            totalPriceGhs: updatedBooking.total_price || 0,
            remainingBalanceGhs: financials.remainingBalance,
          });
        } catch (emailErr) {
          console.error('Failed to send confirmation email from webhook:', emailErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Paystack webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
