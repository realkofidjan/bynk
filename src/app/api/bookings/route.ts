import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import {
  type AvailabilityMap,
  type DayAvailability,
  type TimeSlot,
  isFullDayCategory,
  toDateKey,
} from '@/lib/booking-types';

/* ────────────────────────────────────────
   GET /api/bookings — Fetch availability map
   ──────────────────────────────────────── */

export async function GET() {
  try {
    const supabase = createServerSupabase();

    // Fetch all active bookings (pending + confirmed — not cancelled)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('date, slot, full_day, status')
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Supabase GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Build availability map
    const availabilityMap: AvailabilityMap = {};

    for (const booking of bookings || []) {
      const dateKey = booking.date; // already ISO date string from Supabase

      if (!availabilityMap[dateKey]) {
        availabilityMap[dateKey] = {
          blocked: false,
          slots: { morning: 'available', afternoon: 'available' },
        };
      }

      const day = availabilityMap[dateKey];

      if (booking.full_day || booking.slot === 'full_day') {
        // Full-day booking blocks both slots
        day.blocked = true;
        day.reason = 'full_day_booking';
        day.slots.morning = 'booked';
        day.slots.afternoon = 'booked';
      } else if (booking.slot === 'morning' || booking.slot === 'afternoon') {
        const slotKey: 'morning' | 'afternoon' = booking.slot;
        day.slots[slotKey] = 'booked';

        // Check if all slots are now taken
        if (day.slots.morning === 'booked' && day.slots.afternoon === 'booked') {
          day.blocked = true;
          day.reason = 'all_slots_taken';
        }
      }
    }

    return NextResponse.json(availabilityMap);
  } catch (err) {
    console.error('Bookings GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ────────────────────────────────────────
   POST /api/bookings — Create a new booking
   ──────────────────────────────────────── */

type BookingPayload = {
  date: string; // "YYYY-MM-DD"
  slot: TimeSlot;
  category: string;
  tier: string;
  name: string;
  email: string;
  phone: string;
  addOns: string[];
  totalPrice: number;
};

export async function POST(request: NextRequest) {
  try {
    const body: BookingPayload = await request.json();

    // Validate required fields
    const { date, slot, category, tier, name, email, phone, addOns, totalPrice } = body;
    if (!date || !slot || !category || !tier || !name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate slot value
    if (!['morning', 'afternoon', 'full_day'].includes(slot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
    }

    // Check if date is a Sunday
    const bookingDate = new Date(date + 'T00:00:00');
    if (bookingDate.getDay() === 0) {
      return NextResponse.json({ error: 'Sundays are unavailable for booking' }, { status: 400 });
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json({ error: 'Cannot book dates in the past' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const fullDay = isFullDayCategory(category);

    // Check current availability for this date
    const { data: existingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('slot, full_day')
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    if (fetchError) {
      console.error('Supabase availability check error:', fetchError);
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    // Check for conflicts
    for (const existing of existingBookings || []) {
      // If there's already a full-day booking, the day is blocked
      if (existing.full_day || existing.slot === 'full_day') {
        return NextResponse.json(
          { error: 'This date is fully booked (full-day session)' },
          { status: 409 }
        );
      }

      // If we're trying to book a full day but there are existing partial bookings
      if (fullDay) {
        return NextResponse.json(
          { error: 'This date already has bookings — cannot book a full day' },
          { status: 409 }
        );
      }

      // If the specific slot is already taken
      if (existing.slot === slot) {
        return NextResponse.json(
          { error: `The ${slot} slot is already booked for this date` },
          { status: 409 }
        );
      }
    }

    // Insert the booking
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        date,
        slot: fullDay ? 'full_day' : slot,
        category,
        tier,
        name,
        email,
        phone,
        add_ons: addOns || [],
        total_price: totalPrice || 0,
        status: 'pending',
        full_day: fullDay,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingId: newBooking.id,
    });
  } catch (err) {
    console.error('Bookings POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
