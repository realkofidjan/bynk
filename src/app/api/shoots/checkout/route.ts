import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import {
  calculateBookingFinancials,
  getPackageDeliverables,
  SLOT_LABELS,
  ADDON_NAME_MAP,
  ADDON_PRICES,
  getCategoryLabel,
  parseBookingTier,
} from '@/lib/booking-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');
    const paymentType = searchParams.get('type') || 'balance'; // 'balance' | 'deposit' | 'full'

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking invoice not found' }, { status: 404 });
    }

    const totalPrice = Number(booking.total_price) || 0;
    const addOns = booking.add_ons || [];

    const financials = calculateBookingFinancials({
      total_price: totalPrice,
      add_ons: addOns,
    });

    // Determine charge amount based on requested type
    let chargeAmountGhs = 0;
    let paymentTypeTitle = 'Remaining Balance';

    if (paymentType === 'full') {
      chargeAmountGhs = totalPrice;
      paymentTypeTitle = 'Full Payment (100%)';
    } else if (paymentType === 'deposit') {
      chargeAmountGhs = financials.depositPaid;
      paymentTypeTitle = 'Deposit Payment (50% Base + 100% Add-ons)';
    } else {
      chargeAmountGhs = financials.remainingBalance > 0 ? financials.remainingBalance : totalPrice;
      paymentTypeTitle = 'Remaining Balance (50% Base)';
    }

    // Deliverables
    const deliverables = getPackageDeliverables(booking.category, booking.tier);

    // Format add-ons with names and individual prices
    const itemizedAddOns = addOns.map((item: string) => {
      const key = item.toLowerCase();
      const name = ADDON_NAME_MAP[key] || item;
      const price = ADDON_PRICES[key] || 0;
      return { id: item, name, price };
    });

    const [y, m, d] = (booking.date || '').split('-').map(Number);
    const formattedDate = booking.date ? new Date(y, m - 1, d).toDateString() : 'Scheduled Date';
    const slotLabel = booking.full_day
      ? 'Full Day Coverage'
      : SLOT_LABELS[booking.slot as keyof typeof SLOT_LABELS] || booking.slot || 'Standard Slot';

    const parsedTier = parseBookingTier(booking.tier);

    return NextResponse.json({
      booking: {
        id: booking.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        date: booking.date,
        formattedDate,
        slot: booking.slot,
        slotLabel,
        category: booking.category,
        categoryLabel: getCategoryLabel(booking.category),
        tier: parsedTier.tier,
        shootName: parsedTier.shootName,
        rawTier: booking.tier,
        status: booking.status,
        notes: booking.notes,
        totalPrice,
        basePrice: financials.basePrice,
        addOnsTotal: financials.addOnsTotal,
        depositPaid: financials.depositPaid,
        remainingBalance: financials.remainingBalance,
        chargeAmountGhs,
        paymentType,
        paymentTypeTitle,
        deliverables,
        itemizedAddOns,
      },
    });
  } catch (err: any) {
    console.error('Shoot checkout API error:', err);
    return NextResponse.json({ error: err.message || 'Error loading booking checkout' }, { status: 500 });
  }
}
