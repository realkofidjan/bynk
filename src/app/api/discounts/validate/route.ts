import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, amount } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ valid: false, error: 'Please enter a discount code' }, { status: 400 });
    }

    const currentAmount = Number(amount);
    if (isNaN(currentAmount) || currentAmount <= 0) {
      return NextResponse.json({ valid: false, error: 'Valid purchase amount is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabase = createServerSupabase();

    const { data: discount, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { valid: false, error: 'Discount system is not configured yet in Supabase' },
          { status: 400 }
        );
      }
      return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
    }

    if (!discount) {
      return NextResponse.json({ valid: false, error: `Invalid discount code: "${cleanCode}"` }, { status: 400 });
    }

    if (!discount.is_active) {
      return NextResponse.json({ valid: false, error: `Discount code "${cleanCode}" is no longer active` }, { status: 400 });
    }

    // Expiry check
    if (discount.expires_at) {
      const expiry = new Date(discount.expires_at);
      if (expiry.getTime() < Date.now()) {
        return NextResponse.json({ valid: false, error: `Discount code "${cleanCode}" has expired` }, { status: 400 });
      }
    }

    // Max uses check
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ valid: false, error: `Discount code "${cleanCode}" has reached its maximum usage limit` }, { status: 400 });
    }

    // Min spend check
    if (discount.min_spend && currentAmount < Number(discount.min_spend)) {
      return NextResponse.json({
        valid: false,
        error: `This code requires a minimum spend of GHS ${Number(discount.min_spend).toLocaleString()}`,
      }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmountGhs = 0;
    if (discount.discount_type === 'percentage') {
      discountAmountGhs = Math.round((currentAmount * Number(discount.discount_value)) / 100);
    } else {
      discountAmountGhs = Math.min(currentAmount, Number(discount.discount_value));
    }

    const discountedTotalGhs = Math.max(0, currentAmount - discountAmountGhs);

    return NextResponse.json({
      valid: true,
      code: cleanCode,
      description: discount.description,
      discountType: discount.discount_type,
      discountValue: Number(discount.discount_value),
      discountAmountGhs,
      discountedTotalGhs,
    });
  } catch (err: any) {
    console.error('Discount validation error:', err);
    return NextResponse.json({ valid: false, error: err.message || 'Error validating code' }, { status: 500 });
  }
}
