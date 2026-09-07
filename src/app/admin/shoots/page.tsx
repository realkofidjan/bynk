'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Camera,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  FileText,
  Pencil,
  X,
  DollarSign,
  Check,
  ExternalLink,
  Plus,
  Sparkles,
  Banknote,
  CreditCard,
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
  toDateKey,
  parseBookingTier,
  getCategoryLabel,
} from '@/lib/booking-types';
import CustomOrderCreator from '@/components/custom-order-creator';
import { SendShootEmailModal } from '@/components/send-shoot-email-modal';

export default function AdminShootsPage() {
  const router = useRouter();
  const todayStr = toDateKey(new Date());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'custom-order'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [shoots, setShoots] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Email & cancellation state
  const [emailingShoot, setEmailingShoot] = useState<Booking | null>(null);
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

  // Complete shoot with offline payment state
  const [completingShoot, setCompletingShoot] = useState<Booking | null>(null);
  const [settlementType, setSettlementType] = useState<'balance' | 'full' | 'none'>('balance');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'bank_transfer'>('cash');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completingLoading, setCompletingLoading] = useState(false);

  // Refund tracking state
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
    if (activeTab === 'custom-order') return;
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

  // Check URL param on mount (e.g. /shoots?tab=create or /shoots?tab=custom-order)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'create' || tabParam === 'custom-order' || tabParam === 'custom' || tabParam === 'order') {
        setActiveTab('custom-order');
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'custom-order') {
      fetchShoots();
    }
  }, [fetchShoots, activeTab]);

  // Reset to page 1 on tab or search change
  const handleTabChange = (tab: 'upcoming' | 'completed' | 'custom-order') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleSendWhatsAppLink = async (
    shoot: Booking,
    paymentType: 'full' | 'deposit' | 'balance' = 'balance'
  ) => {
    setSendingEmailId(`${shoot.id}_${paymentType}`);
    setEmailNotice(null);

    try {
      const res = await fetch('/api/shoots/send-payment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: shoot.id, paymentType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      const paystackUrl = data.authorizationUrl;
      const chargeAmount = data.chargeAmountGhs || shoot.total_price;

      if (paystackUrl) {
        let typeDesc = 'Remaining Balance';
        if (paymentType === 'full') typeDesc = 'Full Payment (100%)';
        else if (paymentType === 'deposit') typeDesc = '50% Deposit';

        const waText = `Hi ${shoot.name}, here is your ${typeDesc} link for your photography shoot on ${shoot.date} (${shoot.tier}).\n\nAmount Due: GHS ${chargeAmount.toLocaleString()} (+ 1.95% payment processing fee)\nPay securely via Paystack:\n${paystackUrl}\n\nThank you — BYNK Photography`;

        window.open(
          `https://wa.me/${shoot.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`,
          '_blank'
        );

        setEmailNotice({
          id: shoot.id,
          msg: `Paystack ${typeDesc} link (GHS ${chargeAmount.toLocaleString()}) generated & opened in WhatsApp!`,
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
      console.error('WhatsApp payment link error:', err);
      setEmailNotice({ id: shoot.id, msg: err.message || 'Error generating payment link', type: 'error' });
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

  const handleOpenCompleteModal = (shoot: Booking) => {
    const { remainingBalance } = calculateBookingFinancials({
      total_price: shoot.total_price || 0,
      add_ons: shoot.add_ons || [],
    });
    setCompletingShoot(shoot);
    setSettlementType(remainingBalance > 0 ? 'balance' : 'none');
    setPaymentMethod('cash');
    setCompletionNotes('');
  };

  const handleConfirmComplete = async () => {
    if (!completingShoot) return;
    setCompletingLoading(true);

    try {
      const { remainingBalance } = calculateBookingFinancials({
        total_price: completingShoot.total_price || 0,
        add_ons: completingShoot.add_ons || [],
      });

      const amountPaid =
        settlementType === 'balance'
          ? remainingBalance
          : settlementType === 'full'
          ? Number(completingShoot.total_price || 0)
          : 0;

      const res = await fetch('/api/shoots/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: completingShoot.id,
          settlementType,
          paymentMethod: settlementType === 'none' ? 'none' : paymentMethod,
          amountPaid,
          notes: completionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to mark shoot as completed');
      } else {
        setCompletingShoot(null);
        setCompletionNotes('');
        await fetchShoots();
      }
    } catch (err: any) {
      console.error('Mark completed error:', err);
      alert('Error updating shoot status');
    } finally {
      setCompletingLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground px-4 sm:px-8 lg:px-12 selection:bg-foreground/20 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full min-h-0">
        {/* Fixed Content Header */}
        <div className="flex-none pt-8 pb-6 border-b border-foreground/15">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 text-foreground/40 font-mono text-[10px] uppercase tracking-[0.3em] mb-1 font-medium">
                <Camera className="w-3.5 h-3.5" /> Bookings &amp; Custom Orders
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-foreground">
                Shoots &amp; Orders
              </h1>
              <p className="text-xs font-mono text-foreground/50 mt-1">
                Manage confirmed shoots, client inquiries, balances &amp; offline settlements
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTabChange('custom-order')}
                className="px-4 py-2.5 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all shadow-sm flex items-center gap-2 rounded-none cursor-pointer font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                New Custom Order
              </button>
              <button
                onClick={fetchShoots}
                disabled={loading}
                className="p-2.5 border border-foreground/20 hover:bg-foreground/5 transition-colors cursor-pointer"
                title="Refresh shoots"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-foreground/70 ${loading && activeTab !== 'custom-order' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-6 space-y-6 pb-12 no-scrollbar">
          {/* Tab Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-foreground/[0.02] border border-foreground/10 p-4">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => handleTabChange('upcoming')}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                activeTab === 'upcoming'
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Upcoming Shoots ({activeTab === 'upcoming' ? totalCount : '...'})
            </button>

            <button
              onClick={() => handleTabChange('completed')}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                activeTab === 'completed'
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed ({activeTab === 'completed' ? totalCount : '...'})
            </button>

            <button
              onClick={() => handleTabChange('custom-order')}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                activeTab === 'custom-order'
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              + Create Custom Order
            </button>
          </div>

          {activeTab !== 'custom-order' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search shoots..."
                className="w-full bg-background border border-foreground/15 pl-8 pr-8 py-1.5 text-foreground font-mono text-[10px] placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {activeTab === 'custom-order' ? (
          <div>
            <CustomOrderCreator
              onOrderCreated={() => {
                fetchShoots();
              }}
              onViewShoots={() => handleTabChange('upcoming')}
            />
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-foreground/40 text-xs font-mono">
            Loading shoots data...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-6 text-center text-red-400 text-xs font-mono">
            {error}
          </div>
        ) : shoots.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-foreground/15 p-8 text-foreground/40 text-xs font-mono">
            No {activeTab} shoots found.
          </div>
        ) : (
          <div className="space-y-4 font-mono">
            {shoots.map((shoot) => {
              const isCompleted =
                activeTab === 'completed' ||
                shoot.date < todayStr ||
                (shoot.tier && shoot.tier.includes('[Completed]')) ||
                shoot.status === 'completed';

              const { depositPaid, remainingBalance } = calculateBookingFinancials({
                total_price: shoot.total_price || 0,
                add_ons: shoot.add_ons || [],
              });
              const [y, m, d] = shoot.date.split('-').map(Number);
              const formattedDate = new Date(y, m - 1, d).toDateString();
              const slotLabel = shoot.full_day
                ? 'Full Day'
                : SLOT_LABELS[shoot.slot as keyof typeof SLOT_LABELS] || shoot.slot;

              const cleanTier = getCleanTierName(shoot.tier);
              const parsedTier = parseBookingTier(shoot.tier);
              const completionNote = shoot.add_ons?.find((a) => String(a).startsWith('Completed:'));
              const displayAddOns = (shoot.add_ons || []).filter((a) => !String(a).startsWith('Completed:'));

              return (
                <div
                  key={shoot.id}
                  className={`bg-background border p-5 sm:p-6 transition-colors space-y-4 ${
                    isCompleted
                      ? 'border-emerald-500/25 hover:border-emerald-500/40 bg-emerald-500/[0.01]'
                      : 'border-foreground/20 hover:border-foreground/40'
                  }`}
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
                      {isCompleted ? (
                        <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 border bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
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
                      )}
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
                      {parsedTier.shootName ? (
                        <div>
                          <p className="text-xs text-foreground font-semibold">
                            {parsedTier.shootName}
                          </p>
                          <p className="text-[10px] text-foreground/60">
                            {getCategoryLabel(shoot.category)} · {parsedTier.tier}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-foreground font-medium">
                          {getCategoryLabel(shoot.category)} — {cleanTier}
                        </p>
                      )}
                      {displayAddOns && displayAddOns.length > 0 ? (
                        <p className="text-[10px] text-foreground/60">
                          Add-ons: {displayAddOns.map(formatAddOnName).join(', ')}
                        </p>
                      ) : (
                        <p className="text-[10px] text-foreground/30">No add-ons selected</p>
                      )}
                      {completionNote && (
                        <div className="pt-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>{completionNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-1.5 bg-foreground/[0.03] border border-foreground/10 p-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50">Financials</p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-foreground/60">Total Package:</span>
                        <span className="text-foreground font-medium">GHS {shoot.total_price.toLocaleString()}</span>
                      </div>
                      {isCompleted ? (
                        <>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-foreground/60">Settlement:</span>
                            <span className="text-emerald-400 font-medium">Paid in Full</span>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1 border-t border-foreground/10 font-semibold">
                            <span className="text-foreground">Balance Due:</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              GHS 0 (Settled)
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions Row: View Booking Details, Complete Shoot, and Send Payment Links */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-foreground/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/shoots/${shoot.id}`)}
                        className="text-[10px] uppercase tracking-[0.15em] text-foreground hover:text-foreground/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-foreground/20 px-3 py-1.5 bg-foreground/[0.03] hover:bg-foreground/[0.08]"
                      >
                        <FileText className="w-3.5 h-3.5 text-foreground/70" />
                        View Booking Details
                      </button>

                      <button
                        onClick={() => router.push(`/admin/shoots/${shoot.id}?edit=true`)}
                        className="text-[10px] uppercase tracking-[0.15em] text-foreground hover:text-foreground/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-foreground/20 px-3 py-1.5 bg-foreground/[0.03] hover:bg-foreground/[0.08]"
                      >
                        <Pencil className="w-3.5 h-3.5 text-foreground/70" />
                        Edit Shoot
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmailingShoot(shoot)}
                        className="text-[10px] uppercase tracking-[0.15em] text-foreground hover:text-foreground/80 flex items-center gap-1.5 transition-colors cursor-pointer border border-foreground/20 px-3 py-1.5 bg-foreground/[0.03] hover:bg-foreground/[0.08]"
                      >
                        <Mail className="w-3.5 h-3.5 text-foreground/70" />
                        Send Email
                      </button>

                      {!isCompleted && shoot.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteModal(shoot)}
                          className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/30 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Complete Shoot
                        </button>
                      )}
                    </div>

                    {!isCompleted && activeTab === 'upcoming' && shoot.status !== 'cancelled' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppLink(shoot, 'deposit')}
                          disabled={sendingEmailId !== null}
                          className="px-3 py-1.5 bg-foreground/[0.05] hover:bg-foreground/[0.1] text-foreground border border-foreground/25 text-[9px] uppercase tracking-[0.15em] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <MessageSquare className="w-3 h-3 text-foreground/70" />
                          {sendingEmailId === `${shoot.id}_deposit`
                            ? 'Generating...'
                            : `Send Initial Deposit (GHS ${depositPaid.toLocaleString()})`}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppLink(shoot, 'full')}
                          disabled={sendingEmailId !== null}
                          className="px-3.5 py-1.5 bg-foreground text-background text-[9px] uppercase tracking-[0.15em] font-semibold hover:bg-foreground/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {sendingEmailId === `${shoot.id}_full`
                            ? 'Generating...'
                            : `Send Full Link (GHS ${shoot.total_price.toLocaleString()})`}
                        </button>
                      </div>
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

        {/* Pagination Controls */}
        {activeTab !== 'custom-order' && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-foreground/10 text-xs font-mono pb-8">
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
      </div>

      {/* Complete Shoot with Offline Payment Modal */}
      <AnimatePresence>
        {completingShoot && (() => {
          const { depositPaid, remainingBalance } = calculateBookingFinancials({
            total_price: completingShoot.total_price || 0,
            add_ons: completingShoot.add_ons || [],
          });
          const [y, m, d] = completingShoot.date.split('-').map(Number);
          const formattedDate = new Date(y, m - 1, d).toDateString();
          const effectiveAmountPaid =
            settlementType === 'balance'
              ? remainingBalance
              : settlementType === 'full'
              ? (completingShoot.total_price || 0)
              : 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-8"
              onClick={() => !completingLoading && setCompletingShoot(null)}
            >
              <div className="absolute inset-0 bg-background sm:bg-black/80 sm:backdrop-blur-md" />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full h-full sm:h-auto sm:max-w-lg max-h-full sm:max-h-[85vh] bg-background border-0 sm:border sm:border-emerald-500/30 p-6 rounded-none space-y-5 shadow-2xl overflow-y-auto flex flex-col justify-center"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-mono">
                        BYNK Photography · Status Update
                      </p>
                      <h3 className="text-base font-serif text-foreground font-semibold">
                        Complete Shoot &amp; Record Payment
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => !completingLoading && setCompletingShoot(null)}
                    className="text-foreground/40 hover:text-foreground p-1 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Shoot summary */}
                <div className="bg-foreground/[0.03] border border-foreground/10 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Client:</span>
                    <span className="text-foreground font-semibold">{completingShoot.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Session:</span>
                    <span className="text-foreground">{completingShoot.category} — {completingShoot.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/50">Shoot Date:</span>
                    <span className="text-foreground">{formattedDate}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-foreground/10 font-mono text-[11px]">
                    <span className="text-foreground/60">Total: GHS {Number(completingShoot.total_price || 0).toLocaleString()}</span>
                    <span className="text-emerald-400">Deposit: GHS {depositPaid.toLocaleString()}</span>
                    <span className={remainingBalance > 0 ? 'text-amber-400 font-bold' : 'text-foreground/50'}>
                      Balance: GHS {remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Settlement Mode */}
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-medium">
                    Offline Payment Settlement Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettlementType('balance')}
                      className={`p-2.5 text-center border text-[10px] transition-all cursor-pointer ${
                        settlementType === 'balance'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                          : 'bg-foreground/[0.02] text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      <span className="block font-bold">Remaining Balance</span>
                      <span className="text-[9px] opacity-80">GHS {remainingBalance.toLocaleString()}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettlementType('full')}
                      className={`p-2.5 text-center border text-[10px] transition-all cursor-pointer ${
                        settlementType === 'full'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                          : 'bg-foreground/[0.02] text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      <span className="block font-bold">Full Shoot Fee</span>
                      <span className="text-[9px] opacity-80">GHS {Number(completingShoot.total_price || 0).toLocaleString()}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettlementType('none')}
                      className={`p-2.5 text-center border text-[10px] transition-all cursor-pointer ${
                        settlementType === 'none'
                          ? 'bg-foreground/20 text-foreground border-foreground font-semibold'
                          : 'bg-foreground/[0.02] text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      <span className="block font-bold">Already Settled</span>
                      <span className="text-[9px] opacity-80">No extra payment</span>
                    </button>
                  </div>
                </div>

                {/* Payment Method Selector (if settling offline) */}
                {settlementType !== 'none' && (
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-medium">
                      Offline Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'momo', label: 'Mobile Money', icon: Phone },
                        { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSel = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`p-2 border text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSel
                                ? 'bg-foreground text-background border-foreground font-bold'
                                : 'bg-foreground/[0.02] text-foreground/70 border-foreground/20 hover:border-foreground/40'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Optional notes */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-medium">
                    Completion Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="e.g. Paid cash on location, high-res gallery delivered"
                    className="w-full bg-foreground/[0.02] border border-foreground/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-foreground"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-foreground/10">
                  <button
                    type="button"
                    disabled={completingLoading}
                    onClick={() => setCompletingShoot(null)}
                    className="px-4 py-2 border border-foreground/20 text-[10px] uppercase tracking-wider hover:bg-foreground/5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={completingLoading}
                    onClick={handleConfirmComplete}
                    className="px-5 py-2 bg-emerald-600 text-white text-[10px] uppercase tracking-widest font-semibold hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {completingLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Shoot (GHS {effectiveAmountPaid.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancellingShoot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-8"
            onClick={() => setCancellingShoot(null)}
          >
            <div className="absolute inset-0 bg-background sm:bg-black/80 sm:backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full sm:h-auto sm:max-w-md max-h-full sm:max-h-[85vh] bg-background border-0 sm:border sm:border-red-500/30 p-6 rounded-none space-y-4 shadow-2xl overflow-y-auto flex flex-col justify-center"
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-8"
            onClick={() => setCancelResult(null)}
          >
            <div className="absolute inset-0 bg-background sm:bg-black/80 sm:backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full sm:h-auto sm:max-w-md max-h-full sm:max-h-[85vh] bg-background border-0 sm:border sm:border-foreground/20 p-6 rounded-none space-y-4 shadow-2xl text-center flex flex-col justify-center items-center overflow-y-auto"
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

              <div className="bg-foreground/[0.03] border border-foreground/10 p-3 text-[10px] text-left space-y-1 w-full">
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

              <div className="pt-2 space-y-2 w-full">
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

      {/* Manual Email Dispatch Modal (Brevo) */}
      <SendShootEmailModal
        isOpen={!!emailingShoot}
        onClose={() => setEmailingShoot(null)}
        shoot={emailingShoot}
        onSuccess={(msg) => {
          if (emailingShoot) {
            setEmailNotice({
              id: emailingShoot.id,
              msg,
              type: 'success',
            });
          }
        }}
      />

    </div>
  );
}
