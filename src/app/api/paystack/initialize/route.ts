import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      email,
      totalPrice,
      basePriceGhs,
      addOnsGhs,
      depositAmount,
      exactAmountGhs,
      category,
      tier,
      name,
      phone,
      discountCode,
      paymentType = 'deposit',
    } = body;

    if (!bookingId || !email || !totalPrice) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify booking exists in Supabase
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_price, add_ons, status')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Prevent duplicate payments on already-confirmed bookings
    if (booking.status === 'confirmed') {
      return NextResponse.json(
        { error: 'This booking has already been paid and confirmed. No further payment is required.' },
        { status: 409 }
      );
    }

    // Determine callback URL accurately using host & x-forwarded headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;
    const callbackUrl = `${origin}/book/success?bookingId=${bookingId}`;

    const base = basePriceGhs || totalPrice;
    const addOns = addOnsGhs || 0;
    // Calculate raw undiscounted due amount for this specific transaction
    const rawDueAmount = depositAmount || (paymentType === 'full' ? Number(totalPrice) : (Math.round(base / 2) + addOns));

    let chargeAmount = rawDueAmount;
    let verifiedDiscountCode: string | null = null;
    let appliedDiscountAmount = 0;

    // Validate discount code against the base due amount
    if (discountCode && typeof discountCode === 'string' && discountCode.trim()) {
      const cleanCode = discountCode.trim().toUpperCase();
      const { data: discount } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (discount) {
        const notExpired = !discount.expires_at || new Date(discount.expires_at).getTime() >= Date.now();
        const underLimit = discount.max_uses === null || discount.used_count < discount.max_uses;
        const meetsMinSpend = !discount.min_spend || rawDueAmount >= Number(discount.min_spend);

        if (notExpired && underLimit && meetsMinSpend) {
          verifiedDiscountCode = cleanCode;
          if (discount.discount_type === 'percentage') {
            appliedDiscountAmount = Math.round((rawDueAmount * Number(discount.discount_value)) / 100);
          } else {
            appliedDiscountAmount = Math.min(rawDueAmount, Number(discount.discount_value));
          }

          // Apply discount to charge amount (at least 1 GHS for Paystack)
          chargeAmount = Math.max(1, rawDueAmount - appliedDiscountAmount);
        }
      }
    } else if (exactAmountGhs && Number(exactAmountGhs) > 0) {
      // If client sent exactAmountGhs without a promo code, use it directly
      chargeAmount = Math.round(Number(exactAmountGhs));
    }

    // Initialize transaction with Paystack for the calculated amount (with 1.95% fee borne by client)
    const result = await initializePaystackTransaction({
      email,
      clientName: name,
      amountInGhs: totalPrice,
      exactAmountInGhs: chargeAmount,
      bookingId,
      callbackUrl,
      metadata: {
        booking_id: bookingId,
        category,
        tier,
        name,
        phone,
        payment_type: paymentType,
        discount_code: verifiedDiscountCode || undefined,
        discount_amount: appliedDiscountAmount || undefined,
      },
    });

    if (!result.success || !result.authorizationUrl) {
      return NextResponse.json({ error: result.error || 'Paystack initialization failed' }, { status: 500 });
    }

    // Update booking with generated paystack reference and discount metadata if applied
    const updateData: Record<string, any> = {};
    if (result.reference) {
      updateData.paystack_reference = result.reference;
    }
    if (verifiedDiscountCode) {
      updateData.discount_code = verifiedDiscountCode;
      updateData.discount_amount = appliedDiscountAmount;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      chargeAmountGhs: chargeAmount,
      grossGhs: result.grossGhs,
      feeGhs: result.feeGhs,
      discountCode: verifiedDiscountCode,
      discountAmountGhs: appliedDiscountAmount,
    });
  } catch (err: any) {
    console.error('Paystack initialize route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
