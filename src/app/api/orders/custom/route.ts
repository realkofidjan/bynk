import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import { sendCustomOrderEmail } from '@/lib/email';
import { getDbSlotValue } from '@/lib/booking-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      category = 'custom',
      tier = 'Signature',
      packageTitle = 'Custom Photography Session',
      date,
      timeSlot = '09:00',
      fullDay = false,
      addOns = [],
      notes = '',
      totalPrice = 0,
      paymentOption = 'deposit', // 'deposit' | 'full' | 'paid_offline'
      depositAmount = 0,
      sendEmail = false,
    } = body;

    // Validate essential fields
    if (!name || !email || !date || !totalPrice) {
      return NextResponse.json(
        { error: 'Name, email, shoot date, and total price are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Map slot to valid DB slot constraint ('morning' | 'afternoon' | 'full_day')
    const dbSlot = fullDay ? 'full_day' : getDbSlotValue(timeSlot);

    // Format tier to include tier name, custom title, and exact time
    const tierDisplay = tier && tier !== 'Custom' && !packageTitle.toLowerCase().includes(tier.toLowerCase())
      ? `${tier} — ${packageTitle}`
      : packageTitle;

    const dbTier = timeSlot && !timeSlot.includes(tierDisplay)
      ? `${tierDisplay} @ ${timeSlot}`
      : tierDisplay;

    // Calculate charge amount for Paystack
    let calculatedDeposit = 0;
    if (paymentOption === 'deposit') {
      calculatedDeposit = depositAmount > 0 ? Number(depositAmount) : Math.round(Number(totalPrice) / 2);
    } else if (paymentOption === 'full') {
      calculatedDeposit = Number(totalPrice);
    } else {
      // Paid offline (Cash / Wire)
      calculatedDeposit = Number(totalPrice);
    }

    const initialStatus = paymentOption === 'paid_offline' ? 'confirmed' : 'pending';

    // Insert booking into Supabase
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        date,
        slot: dbSlot,
        category,
        tier: dbTier,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: (phone || '').trim(),
        add_ons: Array.isArray(addOns) ? addOns : [],
        total_price: Number(totalPrice),
        status: initialStatus,
        full_day: Boolean(fullDay),
      })
      .select('*')
      .single();

    if (insertError || !newBooking) {
      console.error('Supabase custom order insert error:', insertError);
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create booking in database' },
        { status: 500 }
      );
    }

    // Determine host and invoice callback URL
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;
    const invoiceUrl = `${origin}/book?status=payment_complete&bookingId=${newBooking.id}`;

    let paystackAuthorizationUrl: string | undefined = undefined;
    let paystackReference: string | undefined = undefined;

    // Initialize Paystack payment if not already marked paid offline and amount > 0
    if (paymentOption !== 'paid_offline' && calculatedDeposit > 0) {
      const paystackResult = await initializePaystackTransaction({
        email: newBooking.email,
        clientName: newBooking.name,
        amountInGhs: Number(totalPrice),
        exactAmountInGhs: calculatedDeposit,
        bookingId: newBooking.id,
        callbackUrl: invoiceUrl,
        metadata: {
          booking_id: newBooking.id,
          category,
          tier: dbTier,
          name: newBooking.name,
          phone: newBooking.phone,
          notes: notes || undefined,
          is_custom_order: true,
          payment_type: paymentOption === 'full' ? 'full_payment' : 'deposit',
        },
      });

      if (paystackResult.success && paystackResult.authorizationUrl) {
        paystackAuthorizationUrl = paystackResult.authorizationUrl;
        paystackReference = paystackResult.reference;

        // Update booking with reference
        await supabase
          .from('bookings')
          .update({ paystack_reference: paystackReference })
          .eq('id', newBooking.id);
      } else {
        console.warn('Paystack initialization warning:', paystackResult.error);
      }
    }

    // Format human-readable date & time for emails / messages
    const [y, m, d] = date.split('-').map(Number);
    const formattedShootDate = new Date(y, m - 1, d).toDateString();
    const formattedTimeLabel = fullDay ? 'Full Day Session' : timeSlot;
    const remainingBalanceGhs = Math.max(0, Number(totalPrice) - calculatedDeposit);

    // Send invoice / proposal email if requested
    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (sendEmail) {
      const emailResult = await sendCustomOrderEmail({
        toEmail: newBooking.email,
        clientName: newBooking.name,
        categoryLabel: category.charAt(0).toUpperCase() + category.slice(1),
        packageName: packageTitle,
        shootDate: formattedShootDate,
        timeSlotLabel: formattedTimeLabel,
        totalAmountGhs: Number(totalPrice),
        depositAmountGhs: calculatedDeposit,
        remainingBalanceGhs,
        paystackAuthorizationUrl,
        invoiceUrl,
        notes,
        addOns,
      });

      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...newBooking,
        paystack_reference: paystackReference || newBooking.paystack_reference,
      },
      bookingId: newBooking.id,
      authorizationUrl: paystackAuthorizationUrl,
      invoiceUrl,
      reference: paystackReference,
      emailSent,
      emailError,
    });
  } catch (err: any) {
    console.error('Custom order creation API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error creating custom order' },
      { status: 500 }
    );
  }
}
