import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { verifyPaystackTransaction } from '@/lib/paystack';
import {
  calculateBookingFinancials,
  formatTimeLabel,
  getBookingStartTime,
  getBookingEndTime,
  Booking,
} from '@/lib/booking-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const bookingId = searchParams.get('bookingId');

    if (!reference && !bookingId) {
      return NextResponse.json(
        { error: 'Transaction reference or booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // 1. Locate the booking in Supabase
    let bookingQuery = supabase.from('bookings').select('*');
    if (bookingId) {
      bookingQuery = bookingQuery.eq('id', bookingId);
    } else if (reference) {
      bookingQuery = bookingQuery.eq('paystack_reference', reference);
    }

    const { data: booking, error: fetchErr } = await bookingQuery.maybeSingle();

    if (fetchErr) {
      console.error('Error finding booking for verification:', fetchErr);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!booking) {
      // If not found by ID or reference, check if reference can be verified directly with Paystack
      if (reference) {
        const verifyRes = await verifyPaystackTransaction(reference);
        if (verifyRes.success && verifyRes.status === 'success') {
          const metaBookingId = verifyRes.metadata?.booking_id;
          if (metaBookingId) {
            const { data: bFromMeta } = await supabase
              .from('bookings')
              .select('*')
              .eq('id', metaBookingId)
              .maybeSingle();

            if (bFromMeta) {
              const { data: confirmedB } = await supabase
                .from('bookings')
                .update({
                  status: 'confirmed',
                  paystack_reference: reference,
                })
                .eq('id', metaBookingId)
                .select('*')
                .single();

              await sendConfirmationEmailSafely(confirmedB || bFromMeta);
              return NextResponse.json({
                success: true,
                booking: confirmedB,
                verified: true,
                paymentType: verifyRes.metadata?.payment_type || 'deposit',
                amountPaidGhs: verifyRes.amount,
              });
            }
          }
        }
      }

      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 2. If booking is already confirmed, return success immediately
    if (booking.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        booking,
        verified: true,
        alreadyConfirmed: true,
        paymentType: 'deposit',
      });
    }

    // 3. Verify transaction live with Paystack
    const refToVerify = reference || booking.paystack_reference;
    if (!refToVerify) {
      // No reference available yet, return current booking
      return NextResponse.json({ success: true, booking, verified: false });
    }

    const verifyResult = await verifyPaystackTransaction(refToVerify);

    if (verifyResult.success && verifyResult.status === 'success') {
      // 4. Update booking to confirmed!
      const updatePayload: Record<string, any> = {
        status: 'confirmed',
        paystack_reference: refToVerify,
      };

      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', booking.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('Failed to update booking status to confirmed:', updateErr);
        return NextResponse.json({ error: 'Failed to confirm booking status' }, { status: 500 });
      }

      // 5. Increment discount code used count if a code was applied
      const discountCodeUsed = booking.discount_code || verifyResult.metadata?.discount_code;
      if (discountCodeUsed) {
        const { data: dRow } = await supabase
          .from('discount_codes')
          .select('id, used_count')
          .eq('code', String(discountCodeUsed).trim().toUpperCase())
          .maybeSingle();

        if (dRow) {
          await supabase
            .from('discount_codes')
            .update({ used_count: (dRow.used_count || 0) + 1 })
            .eq('id', dRow.id);
        }
      }

      // 6. Send official BYNK booking confirmation email
      await sendConfirmationEmailSafely(updatedBooking || booking);

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        verified: true,
        paymentType: verifyResult.metadata?.payment_type || 'deposit',
        amountPaidGhs: verifyResult.amount,
      });
    } else {
      return NextResponse.json({
        success: false,
        booking,
        verified: false,
        paystackStatus: verifyResult.status || 'unknown',
        error: verifyResult.error || 'Payment has not been confirmed by Paystack',
      });
    }
  } catch (err: any) {
    console.error('GET /api/paystack/verify error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function sendConfirmationEmailSafely(booking: Booking) {
  try {
    if (!booking || !booking.email) return;

    const { sendBookingConfirmationEmail } = await import('@/lib/email');

    const isFullDay = booking.full_day || booking.slot === 'full_day';
    const startTime = getBookingStartTime(booking);
    const endTime = getBookingEndTime(booking);
    const timeSlotLabel = isFullDay
      ? 'Full Day Coverage (9:00 AM – 5:00 PM)'
      : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

    const financials = calculateBookingFinancials({
      total_price: Number(booking.total_price) || 0,
      add_ons: booking.add_ons || [],
    });

    await sendBookingConfirmationEmail({
      toEmail: booking.email,
      clientName: booking.name || 'Client',
      bookingRef: booking.paystack_reference || booking.id,
      categoryLabel: (booking.category || 'Photography Shoot').toUpperCase(),
      tierName: booking.tier || 'Package',
      shootDate: booking.date,
      timeSlotLabel,
      depositPaidGhs: financials.depositPaid,
      totalPriceGhs: Number(booking.total_price) || 0,
      remainingBalanceGhs: financials.remainingBalance,
    });
  } catch (err) {
    console.error('Confirmation email error:', err);
  }
}
