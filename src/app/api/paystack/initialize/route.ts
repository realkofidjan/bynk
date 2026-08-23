import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, email, totalPrice, category, tier, name, phone } = body;

    if (!bookingId || !email || !totalPrice) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify booking exists in Supabase
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_price')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Determine callback URL (host + /book?payment=success&bookingId=...)
    const origin = request.headers.get('origin') || request.nextUrl.origin || 'https://bynk-gh.vercel.app';
    const callbackUrl = `${origin}/book?status=payment_complete&bookingId=${bookingId}`;

    const depositGhs = Math.round((totalPrice * 50) / 100);

    // Save deposit_amount to Supabase booking record
    await supabase
      .from('bookings')
      .update({ deposit_amount: depositGhs })
      .eq('id', bookingId);

    // Initialize transaction with Paystack
    const result = await initializePaystackTransaction({
      email,
      amountInGhs: totalPrice,
      depositPercentage: 50,
      bookingId,
      callbackUrl,
      metadata: {
        category,
        tier,
        name,
        phone,
      },
    });

    if (!result.success || !result.authorizationUrl) {
      return NextResponse.json({ error: result.error || 'Paystack initialization failed' }, { status: 500 });
    }

    // Update booking with generated paystack reference
    if (result.reference) {
      await supabase
        .from('bookings')
        .update({ paystack_reference: result.reference })
        .eq('id', bookingId);
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      depositGhs,
    });
  } catch (err: any) {
    console.error('Paystack initialize route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
