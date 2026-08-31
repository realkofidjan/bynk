import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { toDateKey } from '@/lib/booking-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'upcoming'; // 'upcoming' or 'completed'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const todayStr = toDateKey(new Date());

    const supabase = createServerSupabase();

    let query = supabase.from('bookings').select('*', { count: 'exact' });

    if (filter === 'upcoming') {
      query = query.gte('date', todayStr).order('date', { ascending: true });
    } else if (filter === 'completed') {
      query = query.lt('date', todayStr).order('date', { ascending: false });
    } else {
      // 'all' or unfiltered
      query = query.order('date', { ascending: false });
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: bookings, count, error } = await query.range(from, to);

    if (error) {
      console.error('Supabase fetch error in /api/shoots:', error);
      return NextResponse.json({ error: 'Failed to fetch shoots' }, { status: 500 });
    }

    return NextResponse.json({
      shoots: bookings || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('GET /api/shoots error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
