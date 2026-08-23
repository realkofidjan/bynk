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

      if (bookingId) {
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            paystack_reference: reference,
          })
          .eq('id', bookingId);
      } else if (reference) {
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
          })
          .eq('paystack_reference', reference);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Paystack webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
