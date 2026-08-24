import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, email, totalPrice, basePriceGhs, addOnsGhs, depositAmount, category, tier, name, phone } = body;

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

    // Determine callback URL accurately using host & x-forwarded headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;
    const callbackUrl = `${origin}/book?status=payment_complete&bookingId=${bookingId}`;

    const base = basePriceGhs || totalPrice;
    const addOns = addOnsGhs || 0;
    const depositGhs = depositAmount || (Math.round(base / 2) + addOns);

    // Initialize transaction with Paystack for 50% base + 100% add-ons
    const result = await initializePaystackTransaction({
      email,
      clientName: name,
      amountInGhs: totalPrice,
      exactAmountInGhs: depositGhs,
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
