'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mail,
  Calendar,
  Clock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  FileText,
  X,
  DollarSign,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  SLOT_LABELS,
  type Booking,
  calculateBookingFinancials,
  formatAddOnName,
  getCleanTierName,
  getBookingStartTime,
  getBookingEndTime,
  formatTimeLabel,
} from '@/lib/booking-types';

export default function ShootsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [shoots, setShoots] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Email & cancellation state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<{ id: string; msg: string; type: 'success' | 'error'; url?: string } | null>(null);

  const [cancellingShoot, setCancellingShoot] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    bookingId: string;
    diffDays: number;
    isEligibleForAddOnRefund: boolean;
    addOnsTotal?: number;
    addOnRefundGhs?: number;
    clientName: string;
    phone: string;
    shootDate: string;
  } | null>(null);

  // Detailed view & refund tracking state
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [refundedShootIds, setRefundedShootIds] = useState<string[]>([]);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  // Load persisted refunded shoot IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bynk_refunded_shoots');
      if (saved) {
        setRefundedShootIds(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const handleProcessAddOnRefund = async (booking: Booking) => {
    try {
      setProcessingRefundId(booking.id);
      const res = await fetch('/api/shoots/refund-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to process add-on refund');
        return;
      }

      setRefundedShootIds((prev) => {
        const updated = Array.from(new Set([...prev, booking.id]));
        try {
          localStorage.setItem('bynk_refunded_shoots', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      const paystackNoticeStr = data.paystackRefunded
        ? `\n\nPaystack Automated Refund: Triggered live refund via Paystack API to customer account!`
        : data.paystackNotice
          ? `\n\nPaystack API Notice: ${data.paystackNotice} (You can also complete refund manually via Paystack Dashboard).`
          : '';

      const confirmWa = confirm(
        `Add-on refund of GHS ${data.refundAmount} successfully marked processed for ${data.clientName}!${paystackNoticeStr}\n\nWould you like to send a refund confirmation message to the client via WhatsApp now?`
      );

      if (confirmWa) {
        const text = `Hi ${data.clientName}, your add-on refund of GHS ${data.refundAmount.toLocaleString()} for your shoot on ${data.shootDate} has been processed. Thank you — BYNK Photography.`;
        window.open(
          `https://wa.me/${data.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`,
          '_blank'
        );
      }
    } catch (err: any) {
      console.error('Add-on refund error:', err);
      alert('Failed to process add-on refund.');
    } finally {
      setProcessingRefundId(null);
    }
  };

  const fetchShoots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const queryParams = new URLSearchParams({
        filter: activeTab,
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
      });

      const res = await fetch(`/api/shoots?${queryParams}`);
      if (!res.ok) {
        throw new Error('Failed to fetch shoots data');
      }

      const data = await res.json();
      setShoots(data.shoots || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Shoots fetch error:', err);
      setError(err.message || 'Could not load shoots');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchQuery]);

  useEffect(() => {
    fetchShoots();
  }, [fetchShoots]);

  // Reset to page 1 on tab or search change
  const handleTabChange = (tab: 'upcoming' | 'completed') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleSendWhatsAppLink = async (shoot: Booking) => {
    setSendingEmailId(shoot.id);
    setEmailNotice(null);

    try {
      const res = await fetch('/api/shoots/send-payment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: shoot.id }),
      });

      const data = await res.json();
      const paystackUrl = data.authorizationUrl;

      if (paystackUrl) {
        const [y, m, d] = shoot.date.split('-').map(Number);
        const formattedDate = new Date(y, m - 1, d).toDateString();
        const { depositPaid, remainingBalance } = calculateBookingFinancials({
          total_price: shoot.total_price || 0,
          add_ons: shoot.add_ons || [],
        });

        const waText = [
          `Hi ${shoot.name}, regarding your upcoming ${shoot.category} (${shoot.tier}) photography shoot on ${formattedDate}:`,
          ``,
          `Here is your Paystack link to complete your remaining balance of GHS ${remainingBalance.toLocaleString()}:`,
          `${paystackUrl}`,
          ``,
          `Thank you! — BYNK Photography`,
        ].join('\n');

        window.open(
          `https://wa.me/${shoot.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`,
          '_blank'
        );

        setEmailNotice({
          id: shoot.id,
          msg: `Paystack balance link generated & opened in WhatsApp!`,
          type: 'success',
          url: paystackUrl,
        });
      } else {
        setEmailNotice({
          id: shoot.id,
          msg: data.error || 'Failed to generate Paystack payment link',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('WhatsApp balance link error:', err);
      setEmailNotice({ id: shoot.id, msg: 'Error generating payment link', type: 'error' });
    } finally {
      setSendingEmailId(null);
    }
  };

  const confirmCancelShoot = async () => {
    if (!cancellingShoot) return;
    setCancelling(true);

    try {
      const res = await fetch('/api/shoots/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: cancellingShoot.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to cancel shoot');
      } else {
        setCancelResult({
          bookingId: data.bookingId,
          diffDays: data.diffDays,
          isEligibleForAddOnRefund: data.isEligibleForAddOnRefund,
          clientName: data.clientName,
          phone: data.phone,
          shootDate: data.shootDate,
        });
        await fetchShoots();
      }
    } catch (err: any) {
      console.error('Cancel shoot error:', err);
      alert('Error processing shoot cancellation');
    } finally {
      setCancelling(false);
      setCancellingShoot(null);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      const res = await fetch('/api/shoots/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to mark shoot as completed');
      } else {
        await fetchShoots();
      }
    } catch (err: any) {
      console.error('Mark completed error:', err);
      alert('Error updating shoot status');
    }
  };

  return (
    <main className="h-screen max-h-screen bg-background text-foreground selection:bg-foreground/20 font-mono pt-20 sm:pt-24 pb-4 flex flex-col overflow-hidden">
      {/* Header Bar */}
      <header className="flex-none border-b border-foreground/10 bg-background/90 backdrop-blur-md px-6 sm:px-12 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-foreground/40 text-[9px] uppercase tracking-[0.3em] mb-1">
            BYNK Photography · Admin Dashboard
          </p>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-foreground">
            Shoots &amp; Bookings
          </h1>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchShoots}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] border border-foreground/20 px-3 py-2 hover:bg-foreground/[0.05] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-12 py-6 flex flex-col overflow-hidden min-h-0">
        {/* Controls Row: Tabs & Search */}
        <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/10 pb-4 mb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('upcoming')}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.2em] border transition-all cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-sm'
                  : 'bg-transparent text-foreground/50 border-foreground/15 hover:text-foreground hover:border-foreground/30'
              }`}
            >
              Upcoming Shoots ({activeTab === 'upcoming' ? totalCount : '...'})
            </button>

            <button
              onClick={() => handleTabChange('completed')}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.2em] border transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-sm'
                  : 'bg-transparent text-foreground/50 border-foreground/15 hover:text-foreground hover:border-foreground/30'
              }`}
            >
              Completed ({activeTab === 'completed' ? totalCount : '...'})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search client, email, phone..."
              className="w-full bg-foreground/[0.03] border border-foreground/20 pl-9 pr-3 py-2 text-[11px] placeholder:text-foreground/30 focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="py-20 text-center text-foreground/40 text-xs">
            Loading shoots data...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-6 text-center text-red-400 text-xs">
            {error}
          </div>
        ) : shoots.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-foreground/15 p-8 text-foreground/40 text-xs">
            No {activeTab} shoots found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 custom-scrollbar pb-4">
            {shoots.map((shoot) => {
              const { depositPaid, remainingBalance } = calculateBookingFinancials({
                total_price: shoot.total_price || 0,
                add_ons: shoot.add_ons || [],
              });
              const [y, m, d] = shoot.date.split('-').map(Number);
              const formattedDate = new Date(y, m - 1, d).toDateString();
              const slotLabel = shoot.full_day
                ? 'Full Day'
                : SLOT_LABELS[shoot.slot as keyof typeof SLOT_LABELS] || shoot.slot;

              return (
                <div
                  key={shoot.id}
                  className="bg-background border border-foreground/20 p-5 sm:p-6 transition-colors hover:border-foreground/40 space-y-4"
                >
                  {/* Top Bar: Date, Slot & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-foreground/60" />
                        {formattedDate}
                      </span>
                      <span className="text-foreground/20">·</span>
                      <span className="flex items-center gap-1 text-[10px] text-foreground/70 uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-foreground/50" />
                        {slotLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                          shoot.status === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : shoot.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-foreground/10 text-foreground/50 border-foreground/20'
                        }`}
                      >
                        {shoot.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Content: Client Details & Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Client Info */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40">Client Info</p>
                      <p className="text-sm font-serif text-foreground flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-foreground/50 shrink-0" />
                        {shoot.name}
                      </p>
                      <p className="text-[11px] text-foreground/70 flex items-center gap-2">
                        <Mail className="w-3 h-3 text-foreground/40 shrink-0" />
                        <a href={`mailto:${shoot.email}`} className="hover:underline">{shoot.email}</a>
                      </p>
                      <p className="text-[11px] text-foreground/70 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-foreground/40 shrink-0" />
                        <a href={`tel:${shoot.phone}`} className="hover:underline">{shoot.phone}</a>
                      </p>
                    </div>

                    {/* Shoot Details & Addons */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40">Package Details</p>
                      <p className="text-xs text-foreground font-medium">
                        {shoot.category} — {shoot.tier}
                      </p>
                      {shoot.add_ons && shoot.add_ons.length > 0 ? (
                        <p className="text-[10px] text-foreground/60">
                          Add-ons: {shoot.add_ons.join(', ')}
                        </p>
                      ) : (
                        <p className="text-[10px] text-foreground/30">No add-ons selected</p>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-1.5 bg-foreground/[0.03] border border-foreground/10 p-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50">Financials</p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-foreground/60">Total Package:</span>
                        <span className="text-foreground font-medium">GHS {shoot.total_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-foreground/60">Deposit Paid:</span>
                        <span className="text-emerald-400 font-medium">GHS {depositPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1 border-t border-foreground/10 font-semibold">
                        <span className="text-foreground">Balance Due:</span>
                        <span className={remainingBalance > 0 ? 'text-amber-400' : 'text-foreground/50'}>
                          GHS {remainingBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions Row: ONLY View Booking Details and Send Balance Link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-foreground/10">
                    <button
                      onClick={() => setSelectedBookingDetails(shoot)}
                      className="text-[10px] uppercase tracking-[0.15em] text-foreground hover:text-foreground/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-foreground/20 px-3 py-1.5 bg-foreground/[0.03] hover:bg-foreground/[0.08]"
                    >
                      <FileText className="w-3.5 h-3.5 text-foreground/70" />
                      View Booking Details
                    </button>

                    {activeTab === 'upcoming' && shoot.status !== 'cancelled' && remainingBalance > 0 && (
                      <button
                        onClick={() => handleSendWhatsAppLink(shoot)}
                        disabled={sendingEmailId === shoot.id}
                        className="px-4 py-2 bg-foreground text-background text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {sendingEmailId === shoot.id
                          ? 'Generating Link...'
                          : `Send Balance Payment Link via WhatsApp`}
                      </button>
                    )}
                  </div>

                  {/* Email Feedback & Payment Link Actions */}
                  {emailNotice && emailNotice.id === shoot.id && (
                    <div
                      className={`text-[10px] p-3 border space-y-2 ${
                        emailNotice.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {emailNotice.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="font-medium">{emailNotice.msg}</span>
                      </div>

                      {emailNotice.url && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-foreground/10">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(emailNotice.url!);
                              alert('Paystack balance payment link copied to clipboard!');
                            }}
                            className="px-2.5 py-1 bg-foreground/10 hover:bg-foreground/20 text-foreground border border-foreground/20 text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Copy Payment Link
                          </button>

                          <a
                            href={`https://wa.me/${shoot.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${shoot.name}, here is your link to pay the remaining balance of GHS ${remainingBalance.toLocaleString()} for your shoot on ${formattedDate}: ${emailNotice.url}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[9px] uppercase tracking-wider transition-colors"
                          >
                            Send Balance Link via WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fixed Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex-none flex items-center justify-between pt-3 mt-2 border-t border-foreground/10 text-xs font-mono">
            <span className="text-foreground/50 text-[11px]">
              Page {page} of {totalPages} ({totalCount} total shoots)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-foreground/20 hover:bg-foreground/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-foreground/20 hover:bg-foreground/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancellingShoot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setCancellingShoot(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-background border border-red-500/30 p-6 rounded-none space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400 border-b border-foreground/10 pb-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-serif text-foreground font-semibold">
                  Confirm Shoot Cancellation
                </h3>
              </div>

              <p className="text-xs text-foreground/70 leading-relaxed">
                Are you sure you want to cancel the shoot for <strong className="text-foreground">{cancellingShoot.name}</strong> on <strong className="text-foreground">{cancellingShoot.date}</strong>?
              </p>

              <div className="bg-foreground/[0.03] border border-foreground/10 p-3 text-[10px] space-y-1">
                <p className="text-foreground/50 uppercase tracking-wider">Cancellation Terms Notice:</p>
                <p className="text-foreground/70">
                  • 50% Base package deposit is retained (non-refundable).
                </p>
                <p className="text-foreground/70">
                  • Add-ons payments are refundable if cancelled at least 2 days before shoot.
                </p>
                <p className="text-emerald-400 font-semibold pt-1">
                  • Cancelling will immediately free up this date slot for new bookings.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setCancellingShoot(null)}
                  className="px-4 py-2 border border-foreground/20 text-[10px] uppercase tracking-wider hover:bg-foreground/5 transition-colors cursor-pointer"
                >
                  Keep Shoot
                </button>
                <button
                  onClick={confirmCancelShoot}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] uppercase tracking-wider font-semibold hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Result Modal (with WhatsApp Notice) */}
      <AnimatePresence>
        {cancelResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setCancelResult(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-background border border-foreground/20 p-6 rounded-none space-y-4 shadow-2xl text-center"
            >
              <div className="flex justify-center text-red-400">
                <AlertCircle className="w-10 h-10 stroke-[1.5]" />
              </div>

              <div>
                <p className="text-foreground/40 text-[9px] uppercase tracking-[0.3em] mb-1">
                  Shoot Cancelled
                </p>
                <h3 className="text-lg font-serif text-foreground font-semibold">
                  Date Slot Opened
                </h3>
              </div>

              <p className="text-xs text-foreground/70">
                The shoot for <strong className="text-foreground">{cancelResult.clientName}</strong> on {cancelResult.shootDate} has been cancelled in Supabase. The calendar slot is now available.
              </p>

              <div className="bg-foreground/[0.03] border border-foreground/10 p-3 text-[10px] text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-foreground/50">Notice Period:</span>
                  <span className="text-foreground font-semibold">{cancelResult.diffDays} days before shoot</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Add-Ons Refund Status:</span>
                  <span className={cancelResult.isEligibleForAddOnRefund ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {cancelResult.isEligibleForAddOnRefund ? 'Eligible for Refund (>= 2 days)' : 'No Add-On Refund (< 2 days)'}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <a
                  href={`https://wa.me/${cancelResult.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${cancelResult.clientName}, your photography shoot scheduled for ${cancelResult.shootDate} has been cancelled per your request. If eligible under our 2-day policy, add-on refunds will be processed shortly. Thank you — BYNK Photography.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.25em] font-semibold hover:bg-foreground/90 transition-colors shadow-md text-center"
                >
                  Send Cancellation Notice via WhatsApp
                </a>

                <button
                  onClick={() => setCancelResult(null)}
                  className="w-full py-2 bg-transparent text-foreground/50 text-[9px] uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Booking Details Modal (Non-Scrollable Compact Layout) */}
      <AnimatePresence>
        {selectedBookingDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
            onClick={() => setSelectedBookingDetails(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-background border border-foreground/20 p-5 sm:p-6 rounded-none space-y-4 shadow-2xl overflow-hidden font-mono text-foreground"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-foreground/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-foreground/70" />
                  <div>
                    <h3 className="text-sm sm:text-base font-serif font-semibold text-foreground leading-none">
                      Booking Details &amp; Financial Receipt
                    </h3>
                    <p className="text-[9px] text-foreground/40 uppercase tracking-widest mt-0.5">
                      ID: {selectedBookingDetails.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 border ${
                      selectedBookingDetails.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : selectedBookingDetails.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-foreground/10 text-foreground/50 border-foreground/20'
                    }`}
                  >
                    {selectedBookingDetails.status}
                  </span>

                  <button
                    onClick={() => setSelectedBookingDetails(null)}
                    className="p-1 text-foreground/50 hover:text-foreground border border-foreground/20 hover:bg-foreground/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Side-by-Side 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                {/* Left Column: Client & Shoot Parameters */}
                <div className="space-y-3 bg-foreground/[0.02] border border-foreground/10 p-3">
                  <div className="space-y-1 border-b border-foreground/10 pb-2">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-semibold">Client Contact</p>
                    <p className="text-xs font-serif font-medium text-foreground">{selectedBookingDetails.name}</p>
                    <p className="text-foreground/70 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-foreground/40 shrink-0" />
                      <a href={`mailto:${selectedBookingDetails.email}`} className="hover:underline truncate">{selectedBookingDetails.email}</a>
                    </p>
                    <p className="text-foreground/70 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-foreground/40 shrink-0" />
                      <a href={`tel:${selectedBookingDetails.phone}`} className="hover:underline">{selectedBookingDetails.phone}</a>
                    </p>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-semibold">Shoot Parameters</p>
                    <p className="text-foreground/80">
                      Category: <span className="text-foreground font-medium capitalize">{selectedBookingDetails.category}</span>
                    </p>
                    <p className="text-foreground/80">
                      Package: <span className="text-foreground font-medium">{getCleanTierName(selectedBookingDetails.tier)}</span>
                    </p>
                    <p className="text-foreground/80">
                      Date: <span className="text-foreground font-medium">{new Date(selectedBookingDetails.date.split('-').map(Number)[0], selectedBookingDetails.date.split('-').map(Number)[1] - 1, selectedBookingDetails.date.split('-').map(Number)[2]).toDateString()}</span>
                    </p>
                    <p className="text-foreground/80">
                      Time Slot: <span className="text-foreground font-medium">{selectedBookingDetails.full_day || selectedBookingDetails.slot === 'full_day' ? 'Full Day Coverage' : `${formatTimeLabel(getBookingStartTime(selectedBookingDetails))} – ${formatTimeLabel(getBookingEndTime(selectedBookingDetails))}`}</span>
                    </p>
                  </div>
                </div>

                {/* Right Column: Financial Ledger */}
                {(() => {
                  const fin = calculateBookingFinancials({
                    total_price: selectedBookingDetails.total_price || 0,
                    add_ons: selectedBookingDetails.add_ons || [],
                  });

                  return (
                    <div className="space-y-2 bg-foreground/[0.03] border border-foreground/15 p-3 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-semibold mb-2">Financial Ledger</p>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between text-foreground/70">
                            <span>Base Package:</span>
                            <span>GHS {fin.basePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-foreground/70">
                            <span>Add-ons Total (100% upfront):</span>
                            <span>GHS {fin.addOnsTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-foreground font-semibold pt-1 border-t border-foreground/10">
                            <span>Total Shoot Price:</span>
                            <span>GHS {selectedBookingDetails.total_price.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400 font-medium">
                            <span>Deposit Paid Upfront:</span>
                            <span>GHS {fin.depositPaid.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-amber-400 font-semibold pt-2 border-t border-foreground/15 text-xs">
                        <span>Balance Due on Shoot:</span>
                        <span>GHS {fin.remainingBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Add-ons & Refund Banner Section */}
              {(() => {
                const fin = calculateBookingFinancials({
                  total_price: selectedBookingDetails.total_price || 0,
                  add_ons: selectedBookingDetails.add_ons || [],
                });

                const [y, m, d] = selectedBookingDetails.date.split('-').map(Number);
                const shootDateObj = new Date(y, m - 1, d); shootDateObj.setHours(0, 0, 0, 0);
                const todayObj = new Date(); todayObj.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((shootDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
                const isRefundEligible = diffDays >= 2;
                const isRefunded = refundedShootIds.includes(selectedBookingDetails.id);

                return (
                  <div className="space-y-2 text-xs">
                    {/* Add-ons List */}
                    <div className="flex items-center justify-between bg-foreground/[0.02] border border-foreground/10 px-3 py-2 text-[11px]">
                      <span className="text-foreground/50 uppercase text-[9px] tracking-wider font-semibold">Selected Add-ons:</span>
                      <span className="text-foreground/80 font-medium">
                        {selectedBookingDetails.add_ons && selectedBookingDetails.add_ons.length > 0
                          ? selectedBookingDetails.add_ons.map(formatAddOnName).join(', ')
                          : 'None'}
                      </span>
                    </div>

                    {/* Add-on Refund Status (If add-ons exist) */}
                    {fin.addOnsTotal > 0 && (
                      <div className="bg-foreground/[0.02] border border-foreground/10 p-2.5">
                        {isRefunded ? (
                          <div className="flex items-center justify-between text-emerald-400 text-[11px]">
                            <span className="flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Add-on Refund Processed (GHS {fin.addOnsTotal.toLocaleString()})
                            </span>
                            <span className="text-[9px] text-foreground/40">Completed</span>
                          </div>
                        ) : isRefundEligible ? (
                          <div className="flex items-center justify-between gap-2 text-amber-300 text-[11px]">
                            <span className="font-medium">
                              Eligible for Add-on Refund: GHS {fin.addOnsTotal.toLocaleString()} ({diffDays}d notice)
                            </span>
                            <button
                              onClick={() => handleProcessAddOnRefund(selectedBookingDetails)}
                              disabled={processingRefundId === selectedBookingDetails.id}
                              className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[9px] uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {processingRefundId === selectedBookingDetails.id
                                ? 'Processing...'
                                : 'Mark Refund Processed'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-foreground/50 text-[11px]">
                            <span>Add-on Refund Ineligible (Notice &lt; 2 days)</span>
                            <span className="text-[9px] text-foreground/40">GHS {fin.addOnsTotal.toLocaleString()} Retained</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Modal Footer with Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-foreground/10 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/${selectedBookingDetails.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedBookingDetails.name}, regarding your upcoming BYNK photography shoot...`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] uppercase tracking-wider text-foreground/70 hover:text-foreground border border-foreground/20 px-2.5 py-1 flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp
                  </a>

                  {selectedBookingDetails.status !== 'cancelled' && selectedBookingDetails.status !== 'completed' && (
                    <button
                      onClick={() => {
                        const id = selectedBookingDetails.id;
                        setSelectedBookingDetails(null);
                        handleMarkCompleted(id);
                      }}
                      className="text-[9px] uppercase tracking-wider text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Complete
                    </button>
                  )}

                  {selectedBookingDetails.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        const b = selectedBookingDetails;
                        setSelectedBookingDetails(null);
                        setCancellingShoot(b);
                      }}
                      className="text-[9px] uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/30 px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedBookingDetails(null)}
                  className="px-4 py-1.5 bg-foreground text-background text-[10px] uppercase tracking-widest font-semibold hover:bg-foreground/90 transition-colors cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
