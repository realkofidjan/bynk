'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CreditCard,
  Download,
  Share2,
  ChevronLeft,
  Loader2,
  FileText,
  Mail,
  User,
  Phone,
  Sparkles,
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

function LookupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialEmail = searchParams.get('email') || '';
  const initialRef = searchParams.get('ref') || searchParams.get('reference') || '';

  const [email, setEmail] = useState(initialEmail);
  const [reference, setReference] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [resumingPaymentId, setResumingPaymentId] = useState<string | null>(null);

  const handleSearch = async (targetEmail?: string, targetRef?: string) => {
    const searchEmail = (targetEmail !== undefined ? targetEmail : email).trim();
    const searchRef = (targetRef !== undefined ? targetRef : reference).trim();

    if (!searchEmail && !searchRef) {
      setError('Please enter your email address or booking reference.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: searchEmail, reference: searchRef }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setHasSearched(true);
      } else {
        setError(data.error || 'Failed to find bookings.');
      }
    } catch (err: any) {
      console.error('Lookup search error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if search params provided
  useEffect(() => {
    if (initialEmail || initialRef) {
      handleSearch(initialEmail, initialRef);
    }
  }, []);

  const handleResumePayment = async (booking: Booking) => {
    setResumingPaymentId(booking.id);
    try {
      const { depositPaid, remainingBalance } = calculateBookingFinancials({
        total_price: booking.total_price || 0,
        add_ons: booking.add_ons || [],
      });

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.email,
          name: booking.name,
          phone: booking.phone,
          category: booking.category,
          tier: booking.tier,
          totalPrice: booking.total_price,
          depositAmount: depositPaid,
        }),
      });

      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert(data.error || 'Failed to initialize payment. Please try again.');
      }
    } catch (err: any) {
      console.error('Payment resume error:', err);
      alert('Error initiating checkout.');
    } finally {
      setResumingPaymentId(null);
    }
  };

  const handleDownloadIcs = (booking: Booking) => {
    const icsContent = createIcsContent([booking], true);
    const dateFormatted = booking.date.replace(/-/g, '');
    downloadIcsFile(`BYNK_Shoot_${dateFormatted}.ics`, icsContent);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Back Link */}
      <Link
        href="/book"
        className="inline-flex items-center gap-2 text-xs font-mono text-foreground/40 hover:text-foreground transition-colors uppercase tracking-[0.2em]"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Booking
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-foreground/40 block">
          Client Self-Service Portal
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
          Find Your Bookings
        </h1>
        <p className="text-foreground/50 text-xs font-mono max-w-lg leading-relaxed">
          Enter the email address you used during booking or your unique booking reference to check your reservation status, download calendar invites, or complete pending payments.
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="p-6 bg-foreground/[0.02] border border-foreground/10 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/60 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-foreground/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-foreground/15 pl-9 pr-3 py-2.5 text-xs font-mono text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/60 block">
              Booking Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. BYNK_... or ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-background border border-foreground/15 px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs font-mono text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-foreground text-background text-[11px] font-mono uppercase tracking-[0.2em] font-medium hover:bg-foreground/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching Records...
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              Look Up Bookings
            </>
          )}
        </button>
      </form>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/70">
              Found Bookings ({bookings.length})
            </h2>
            {bookings.length > 0 && (
              <span className="text-[10px] font-mono text-foreground/40">
                Sorted by most recent
              </span>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-foreground/15 space-y-3">
              <AlertCircle className="w-8 h-8 text-foreground/30 mx-auto" />
              <h3 className="font-serif text-lg text-foreground">No Bookings Found</h3>
              <p className="text-xs font-mono text-foreground/50 max-w-sm mx-auto">
                We couldn&apos;t locate any bookings matching the provided details. Please verify the email address or booking reference.
              </p>
              <div className="pt-2">
                <Link
                  href="/book"
                  className="inline-block px-4 py-2 border border-foreground/20 text-[10px] font-mono uppercase tracking-widest text-foreground hover:bg-foreground/[0.04] transition-colors"
                >
                  Book a New Session
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((b) => {
                const isConfirmed = b.status === 'confirmed';
                const isPending = b.status === 'pending';
                const isCompleted = b.status === 'completed';
                const isCancelled = b.status === 'cancelled';

                const financials = calculateBookingFinancials({
                  total_price: b.total_price || 0,
                  add_ons: b.add_ons || [],
                });

                const isFullDay = b.full_day || b.slot === 'full_day';
                const startTime = getBookingStartTime(b);
                const endTime = getBookingEndTime(b);
                const timeDisplay = isFullDay
                  ? 'Full Day (9:00 AM – 5:00 PM)'
                  : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

                const googleCalUrl = createGoogleCalendarUrl(b, true);

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-foreground/15 bg-foreground/[0.01] divide-y divide-foreground/[0.08]"
                  >
                    {/* Header */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-foreground/[0.02]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg text-foreground font-medium">
                            {b.category.toUpperCase()} — {getCleanTierName(b.tier)}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-foreground/40 mt-0.5">
                          Ref: <code className="text-foreground/70">{b.paystack_reference || b.id}</code>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="self-start sm:self-auto">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed (Deposit Paid)
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock3 className="w-3 h-3 animate-pulse" />
                            Pending Deposit
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-foreground/40 uppercase tracking-widest block mb-1">Date</span>
                        <span className="text-foreground flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-foreground/40" />
                          {b.date}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-foreground/40 uppercase tracking-widest block mb-1">Time</span>
                        <span className="text-foreground flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-foreground/40" />
                          {timeDisplay}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-foreground/40 uppercase tracking-widest block mb-1">Deposit Paid</span>
                        <span className="text-emerald-400 font-medium">
                          {isConfirmed || isCompleted
                            ? `GHS ${financials.depositPaid.toLocaleString()}`
                            : 'Unpaid'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-foreground/40 uppercase tracking-widest block mb-1">Total / Balance</span>
                        <span className="text-foreground font-medium">
                          GHS {b.total_price?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Add-ons */}
                    {b.add_ons && b.add_ons.length > 0 && (
                      <div className="p-5 py-3 bg-foreground/[0.01]">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/40 mr-2">
                          Add-ons:
                        </span>
                        <span className="text-[11px] font-mono text-foreground/70">
                          {b.add_ons.map((addon) => formatAddOnName(addon)).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="p-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {(isConfirmed || isCompleted) && (
                          <>
                            <button
                              onClick={() => handleDownloadIcs(b)}
                              className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-foreground/20 text-foreground hover:bg-foreground/[0.04] transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              Calendar (.ics)
                            </button>

                            {googleCalUrl && (
                              <a
                                href={googleCalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-foreground/20 text-foreground hover:bg-foreground/[0.04] transition-colors flex items-center gap-1.5"
                              >
                                <Calendar className="w-3 h-3" />
                                Google Calendar
                              </a>
                            )}
                          </>
                        )}
                      </div>

                      {/* If pending, show pay deposit button */}
                      {isPending && (
                        <button
                          onClick={() => handleResumePayment(b)}
                          disabled={resumingPaymentId === b.id}
                          className="px-4 py-2 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.15em] font-medium hover:bg-foreground/90 transition-colors flex items-center gap-2 cursor-pointer ml-auto"
                        >
                          {resumingPaymentId === b.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5" />
                              Complete Deposit Payment
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingLookupPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-28 sm:pt-32 pb-20 px-4 sm:px-8 selection:bg-foreground/20">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-foreground/50" />
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40">
              Loading Portal...
            </p>
          </div>
        }
      >
        <LookupContent />
      </Suspense>
    </main>
  );
}
