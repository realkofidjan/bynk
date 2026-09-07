import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reference } = body;

    if (!email && !reference) {
      return NextResponse.json(
        { error: 'Please provide your email address or booking reference.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    let query = supabase.from('bookings').select('*');

    if (reference && reference.trim()) {
      const ref = reference.trim();
      if (ref.startsWith('BYNK_')) {
        query = query.eq('paystack_reference', ref);
      } else {
        query = query.or(`id.eq.${ref},paystack_reference.eq.${ref}`);
      }
    }

    if (email && email.trim()) {
      query = query.ilike('email', email.trim());
    }

    const { data: bookings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Booking lookup query error:', error);
      return NextResponse.json({ error: 'Failed to look up bookings.' }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (err: any) {
    console.error('Booking lookup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
