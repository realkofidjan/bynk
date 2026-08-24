import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import {
  type Booking,
  type TimeSlot,
  isFullDayCategory,
  calculateAvailableTimeSlots,
  getDbSlotValue,
} from '@/lib/booking-types';

/* ────────────────────────────────────────
   GET /api/bookings — Fetch active bookings & availability
   ──────────────────────────────────────── */

export async function GET() {
  try {
    const supabase = createServerSupabase();

    // Fetch all active bookings (pending + confirmed — not cancelled)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, date, slot, category, tier, full_day, status')
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Supabase GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({
      bookings: bookings || [],
    });
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
  slot: TimeSlot; // e.g. "09:00", "11:30", "full_day"
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
    const fullDay = isFullDayCategory(category, tier);

    // Check current active bookings for this date
    const { data: existingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    if (fetchError) {
      console.error('Supabase availability check error:', fetchError);
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    // Verify requested time slot against airtight schedule calculator
    const availableSlots = calculateAvailableTimeSlots(
      (existingBookings as Booking[]) || [],
      category,
      tier
    );

    const isSlotValid = availableSlots.some((s) => s.timeStr === slot);
    if (!isSlotValid) {
      return NextResponse.json(
        {
          error:
            'The selected time slot is no longer available due to existing bookings, buffer requirements, or category limits.',
        },
        { status: 409 }
      );
    }

    // Convert slot to DB allowed constraint value ('morning' | 'afternoon' | 'full_day')
    const dbSlot = fullDay ? 'full_day' : getDbSlotValue(slot);

    // Embed exact start time in tier string if slot is HH:MM (e.g. "Signature @ 09:30")
    const dbTier = !fullDay && slot.includes(':') ? `${tier} @ ${slot}` : tier;

    type ExtendedBookingPayload = BookingPayload & {
      depositAmount?: number;
      basePriceGhs?: number;
      addOnsGhs?: number;
    };
    const { depositAmount } = body as ExtendedBookingPayload;
    const initialDeposit = depositAmount || Math.round((totalPrice || 0) / 2);

    // Insert the booking
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        date,
        slot: dbSlot,
        category,
        tier: dbTier,
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
      console.error('Supabase insert error details:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { error: insertError.message || insertError.details || 'Failed to create booking' },
        { status: 500 }
      );
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

