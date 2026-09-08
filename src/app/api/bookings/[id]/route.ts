import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    let query = supabase.from('bookings').select('*');
    if (id.startsWith('BYNK_')) {
      query = query.eq('paystack_reference', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const noteEntry = (booking.add_ons || []).find((a: string) => String(a).startsWith('Note:'));
    booking.notes = noteEntry ? String(noteEntry).replace(/^Note:\s*/, '') : '';

    // If still marked pending but has paystack_reference, verify live with Paystack and auto-promote to confirmed
    if (booking.status === 'pending' && booking.paystack_reference) {
      try {
        const { verifyPaystackTransaction } = await import('@/lib/paystack');
        const vResult = await verifyPaystackTransaction(booking.paystack_reference);
        if (vResult.success && vResult.status === 'success') {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', booking.id);
          booking.status = 'confirmed';
        }
      } catch (vErr) {
        console.warn('Paystack inline check error:', vErr);
      }
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('Booking GET by ID error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/bookings/[id] — Update booking fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch existing booking
    const { data: existing, error: fetchErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Build update object from valid database columns only (notes is stored in add_ons)
    const body = await request.json();
    const allowedColumns = [
      'name', 'email', 'phone', 'date', 'slot', 'category', 'tier',
      'total_price', 'full_day', 'status',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedColumns) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle add_ons and notes safely without failing on missing notes column
    let currentAddOns: string[] = Array.isArray(body.add_ons)
      ? [...body.add_ons]
      : Array.isArray(existing.add_ons)
      ? [...existing.add_ons]
      : [];

    const completedTag = (existing.add_ons || []).find((a: string) => String(a).startsWith('Completed:'));
    if (completedTag && !currentAddOns.includes(completedTag)) {
      currentAddOns.unshift(completedTag);
    }

    if (body.notes !== undefined) {
      currentAddOns = currentAddOns.filter((a: string) => !String(a).startsWith('Note:'));
      if (typeof body.notes === 'string' && body.notes.trim()) {
        currentAddOns.push(`Note: ${body.notes.trim()}`);
      }
      updates.add_ons = currentAddOns;
    } else if (body.add_ons !== undefined) {
      updates.add_ons = currentAddOns;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('Booking PATCH error:', updateErr);
      return NextResponse.json(
        { error: updateErr.message || 'Failed to update booking' },
        { status: 500 }
      );
    }

    const updatedNoteEntry = (updated.add_ons || []).find((a: string) => String(a).startsWith('Note:'));
    const bookingWithNotes = {
      ...updated,
      notes: updatedNoteEntry ? String(updatedNoteEntry).replace(/^Note:\s*/, '') : '',
    };

    return NextResponse.json({ booking: bookingWithNotes, success: true });
  } catch (err) {
    console.error('Booking PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
