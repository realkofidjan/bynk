'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  ArrowRight,
  Download,
  Share2,
  Loader2,
  AlertCircle,
  Home,
  Camera,
} from 'lucide-react';
import {
  type Booking,
  calculateBookingFinancials,
  formatAddOnName,
  getCleanTierName,
  getBookingStartTime,
  getBookingEndTime,
  formatTimeLabel,
} from '@/lib/booking-types';
import {
  createIcsContent,
  downloadIcsFile,
  createGoogleCalendarUrl,
} from '@/lib/ics-calendar';

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const targetId = bookingIdParam || reference;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Clear pending booking from localStorage upon payment success
    try {
      localStorage.removeItem('bynk_pending_booking_id');
      localStorage.removeItem('bynk_pending_booking');
    } catch {
      // Ignore localStorage errors
    }

    if (!targetId) {
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${targetId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking || null);
        } else {
          setError('Could not load booking details.');
        }
      } catch (err: any) {
        console.error('Error fetching booking details:', err);
        setError('Network error loading details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [targetId]);

  const handleDownloadIcs = () => {
    if (!booking) return;
    const icsContent = createIcsContent([booking], true);
    const dateFormatted = booking.date.replace(/-/g, '');
    downloadIcsFile(`BYNK_Shoot_${dateFormatted}.ics`, icsContent);
  };

  const handleOpenWhatsapp = () => {
    const bookingRef = booking?.paystack_reference || targetId || 'N/A';
    const message = [
      `Hi BYNK! I have completed my 50% deposit payment on Paystack.`,
      ``,
      `Booking Reference: ${bookingRef}`,
      booking ? `Client: ${booking.name}` : '',
      booking ? `Category: ${booking.category} (${booking.tier})` : '',
      booking ? `Date: ${booking.date}` : '',
      `Please let me know once confirmed!`,
    ]
      .filter(Boolean)
      .join('\n');

    window.open(
      `https://wa.me/233205555084?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-foreground/50" />
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40">
          Confirming Payment &amp; Reservation...
        </p>
      </div>
    );
  }

  const isFullDay = booking?.full_day || booking?.slot === 'full_day';
  const startTime = booking ? getBookingStartTime(booking) : '09:00';
  const endTime = booking ? getBookingEndTime(booking) : '17:00';
  const timeDisplay = isFullDay
    ? 'Full Day Coverage (Starts 9:00 AM)'
    : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

  const financials = calculateBookingFinancials({
    total_price: booking?.total_price || 0,
    add_ons: booking?.add_ons || [],
  });

  const googleCalUrl = booking ? createGoogleCalendarUrl(booking, true) : '';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-medium">
            Payment Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
            Your Shoot is Reserved
          </h1>
          <p className="text-foreground/50 text-xs font-mono max-w-md mx-auto">
            Thank you for choosing BYNK Photography. A confirmation email has been dispatched with your booking reference.
          </p>
        </div>

        {booking && (
          <div className="inline-block bg-foreground/[0.03] border border-foreground/10 px-4 py-2 mt-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40 mr-2">
              Reference:
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {booking.paystack_reference || booking.id}
            </span>
          </div>
        )}
      </motion.div>

      {/* Booking Details Card */}
      {booking ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-foreground/[0.02] border border-foreground/10 divide-y divide-foreground/[0.06]"
        >
          {/* Section 1: Shoot Overview */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                Session Overview
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Confirmed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[9px] text-foreground/40 uppercase tracking-widest block">Package</span>
                <span className="font-serif text-base text-foreground font-normal">
                  {booking.category.toUpperCase()} — {getCleanTierName(booking.tier)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-foreground/40 uppercase tracking-widest block">Client Name</span>
                <span className="text-foreground">{booking.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-foreground/40 uppercase tracking-widest block">Shoot Date</span>
                <span className="text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-foreground/40" />
                  {booking.date}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-foreground/40 uppercase tracking-widest block">Time Slot</span>
                <span className="text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-foreground/40" />
                  {timeDisplay}
                </span>
              </div>
            </div>

            {booking.add_ons && booking.add_ons.length > 0 && (
              <div className="pt-3 border-t border-foreground/[0.06]">
                <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/40 block mb-2">
                  Selected Add-Ons:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {booking.add_ons.map((addon, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 bg-foreground/[0.04] border border-foreground/10 text-foreground/70"
                    >
                      {formatAddOnName(addon)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Financial Breakdown */}
          <div className="p-6 space-y-3 bg-foreground/[0.01]">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40 block">
              Payment Breakdown
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-foreground/60">
                <span>Total Package Price:</span>
                <span>GHS {booking.total_price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Deposit Paid (50% + Add-ons):
                </span>
                <span>GHS {financials.depositPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-foreground pt-2 border-t border-foreground/10 font-bold">
                <span>Remaining Balance Due on Shoot Day:</span>
                <span className={financials.remainingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  GHS {financials.remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Actions */}
          <div className="p-6 space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/40 block">
              Add to Calendar &amp; Actions
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-foreground/20 text-[10px] font-mono uppercase tracking-[0.15em] text-foreground hover:bg-foreground/[0.05] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Apple/Outlook (.ics)
              </button>

              {googleCalUrl && (
                <a
                  href={googleCalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-foreground/20 text-[10px] font-mono uppercase tracking-[0.15em] text-foreground hover:bg-foreground/[0.05] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Add to Google Calendar
                </a>
              )}
            </div>

            <button
              onClick={handleOpenWhatsapp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-foreground text-background text-[11px] font-mono uppercase tracking-[0.2em] font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Notify Photographer on WhatsApp
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="p-8 border border-foreground/10 text-center space-y-4">
          <p className="text-xs font-mono text-foreground/60">
            Payment has been registered. Reference: <code className="text-foreground">{targetId || 'Confirmed'}</code>
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-foreground/10 text-xs font-mono">
        <Link
          href="/book/lookup"
          className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1.5 uppercase tracking-wider"
        >
          View All Your Bookings <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/"
          className="text-foreground/40 hover:text-foreground/70 transition-colors flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Home className="w-3.5 h-3.5" /> Back to BYNK Photography
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-28 sm:pt-32 pb-20 px-4 sm:px-8 selection:bg-foreground/20">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-foreground/50" />
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40">
              Loading...
            </p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </main>
  );
}
