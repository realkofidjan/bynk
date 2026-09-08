import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { DiscountType } from '@/lib/booking-types';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return NextResponse.json({
          discounts: [],
          tableMissing: true,
          message: 'The discount_codes table has not been created yet in Supabase. Run supabase/discounts.sql in your Supabase SQL editor.',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discounts: data || [], tableMissing: false });
  } catch (err: any) {
    console.error('Error fetching discounts:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_spend = 0,
      max_uses = null,
      expires_at = null,
    } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    if (!discount_type || !['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Discount type must be percentage or fixed' }, { status: 400 });
    }

    const valueNum = Number(discount_value);
    if (isNaN(valueNum) || valueNum <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 });
    }

    if (discount_type === 'percentage' && valueNum > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('discount_codes')
      .insert({
        code: cleanCode,
        description: description?.trim() || null,
        discount_type: discount_type as DiscountType,
        discount_value: valueNum,
        min_spend: Number(min_spend) || 0,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Code "${cleanCode}" already exists` }, { status: 400 });
      }
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Please create the discount_codes table in Supabase first (see supabase/discounts.sql).' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, discount: data });
  } catch (err: any) {
    console.error('Error creating discount:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, is_active } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('discount_codes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, discount: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
