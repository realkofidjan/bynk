'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Pencil,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  Loader2,
  Banknote,
  CreditCard,
  Sparkles,
  Camera,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  type Booking,
  type BookingStatus,
  calculateBookingFinancials,
  formatAddOnName,
  getCleanTierName,
  getBookingStartTime,
  getBookingEndTime,
  formatTimeLabel,
  toDateKey,
  RATE_CATEGORIES,
  getCategoryLabel,
  parseBookingTier,
  formatBookingDbTier,
  ALL_ADDONS,
  getAddOnPrice,
  ADDON_PRICES,
} from '@/lib/booking-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChronoSelect } from '@/components/ui/chrono-select';
import { SendShootEmailModal } from '@/components/send-shoot-email-modal';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Booking>>({});
  const [editShootName, setEditShootName] = useState('');
  const [editAddOns, setEditAddOns] = useState<string[]>([]);
  const [selectedAddOnToAdd, setSelectedAddOnToAdd] = useState<string>('');
  const [customAddOnName, setCustomAddOnName] = useState<string>('');
  const [customAddOnPrice, setCustomAddOnPrice] = useState<number>(0);
  const [showCustomAddOnInput, setShowCustomAddOnInput] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Complete shoot state
  const [showComplete, setShowComplete] = useState(false);
  const [settlementType, setSettlementType] = useState<'balance' | 'full' | 'none'>('balance');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'bank_transfer'>('cash');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completingLoading, setCompletingLoading] = useState(false);

  // Cancel state
  const [showCancel, setShowCancel] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Payment link state
  const [sendingPaymentLink, setSendingPaymentLink] = useState<string | null>(null);
  const [paymentLinkResult, setPaymentLinkResult] = useState<{ msg: string; type: 'success' | 'error'; url?: string } | null>(null);

  const todayStr = toDateKey(new Date());

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) throw new Error('Booking not found');
      const data = await res.json();
      setBooking(data.booking || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const isCompleted =
    booking &&
    (booking.date < todayStr ||
      (booking.tier && booking.tier.includes('[Completed]')) ||
      booking.status === 'completed');

  const canEdit = !!booking;

  const startEditing = () => {
    if (!booking) return;
    const parsed = parseBookingTier(booking.tier);
    const nonSystemAddOns = (booking.add_ons || []).filter(
      (a) => !String(a).startsWith('Completed:') && !String(a).startsWith('Note:')
    );
    setEditForm({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      date: booking.date,
      slot: booking.slot,
      category: booking.category,
      tier: parsed.tier,
      total_price: booking.total_price,
      notes: bookingNotes,
      status: booking.status,
    });
    setEditShootName(parsed.shootName);
    setEditAddOns([...nonSystemAddOns]);
    setSelectedAddOnToAdd('');
    setShowCustomAddOnInput(false);
    setEditing(true);
    setSaveError('');
    setSaveSuccess(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && booking) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('edit') === 'true' && !editing) {
        startEditing();
      }
    }
  }, [booking]);

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
    setEditShootName('');
    setEditAddOns([]);
    setSelectedAddOnToAdd('');
    setShowCustomAddOnInput(false);
    setSaveError('');
  };

  const handleRemoveAddOn = (indexToRemove: number) => {
    const removedItem = editAddOns[indexToRemove];
    const price = getAddOnPrice(removedItem);
    const updated = editAddOns.filter((_, idx) => idx !== indexToRemove);
    setEditAddOns(updated);
    if (price > 0 && editForm.total_price) {
      setEditForm((prev) => ({
        ...prev,
        total_price: Math.max(0, (prev.total_price || 0) - price),
      }));
    }
  };

  const handleAddSelectedAddOn = () => {
    if (!selectedAddOnToAdd) return;
    if (selectedAddOnToAdd === 'custom') {
      setShowCustomAddOnInput(true);
      return;
    }
    const price = ADDON_PRICES[selectedAddOnToAdd] || 0;
    setEditAddOns((prev) => [...prev, selectedAddOnToAdd]);
    if (price > 0) {
      setEditForm((prev) => ({
        ...prev,
        total_price: (prev.total_price || 0) + price,
      }));
    }
    setSelectedAddOnToAdd('');
  };

  const handleAddCustomAddOn = () => {
    const trimmed = customAddOnName.trim();
    if (!trimmed) return;
    const itemLabel = customAddOnPrice > 0 ? `${trimmed} (GHS ${customAddOnPrice})` : trimmed;
    setEditAddOns((prev) => [...prev, itemLabel]);
    if (customAddOnPrice > 0) {
      setEditForm((prev) => ({
        ...prev,
        total_price: (prev.total_price || 0) + customAddOnPrice,
      }));
    }
    setCustomAddOnName('');
    setCustomAddOnPrice(0);
    setShowCustomAddOnInput(false);
    setSelectedAddOnToAdd('');
  };

  const handleSave = async () => {
    if (!booking) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const parsed = parseBookingTier(booking.tier);
      const dbTier = formatBookingDbTier({
        tier: editForm.tier || parsed.tier || 'Signature',
        shootName: editShootName,
        timeSlotTrailer: parsed.timeSlotTrailer,
        completedTrailer: parsed.completedTrailer,
      });

      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          tier: dbTier,
          add_ons: editAddOns,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save changes');
        return;
      }

      setBooking(data.booking);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmComplete = async () => {
    if (!booking) return;
    setCompletingLoading(true);

    try {
      const { remainingBalance } = calculateBookingFinancials({
        total_price: booking.total_price || 0,
        add_ons: booking.add_ons || [],
      });

      const amountPaid =
        settlementType === 'balance'
          ? remainingBalance
          : settlementType === 'full'
          ? Number(booking.total_price || 0)
          : 0;

      const res = await fetch('/api/shoots/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
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
        setShowComplete(false);
        await fetchBooking();
      }
    } catch (err: any) {
      alert('Error updating shoot status');
    } finally {
      setCompletingLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);

    try {
      const res = await fetch('/api/shoots/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to cancel shoot');
      } else {
        setShowCancel(false);
        await fetchBooking();

        if (data.phone && data.clientName) {
          const msg = `Hi ${data.clientName}, your photography shoot scheduled for ${data.shootDate} has been cancelled per your request. If eligible under our 2-day policy, add-on refunds will be processed shortly. Thank you — BYNK Photography.`;
          window.open(
            `https://wa.me/${data.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`,
            '_blank'
          );
        }
      }
    } catch {
      alert('Error processing cancellation');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendPaymentLink = async (paymentType: 'deposit' | 'full' | 'balance') => {
    if (!booking) return;
    setSendingPaymentLink(paymentType);
    setPaymentLinkResult(null);

    try {
      const res = await fetch('/api/shoots/send-payment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, paymentType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate payment link');

      const checkoutUrl = data.checkoutUrl || data.authorizationUrl;
      const chargeAmount = data.chargeAmountGhs || booking.total_price;

      if (checkoutUrl) {
        let typeDesc = 'Remaining Balance';
        if (paymentType === 'full') typeDesc = 'Full Payment (100%)';
        else if (paymentType === 'deposit') typeDesc = '50% Deposit';

        const waText = `Hi ${booking.name}, here is your bespoke invoice & checkout link for your photography shoot on ${booking.date} (${booking.tier}).\n\nView deliverables, apply discount codes & pay securely:\n${checkoutUrl}\n\nThank you — BYNK Photography`;

        window.open(
          `https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`,
          '_blank'
        );

        setPaymentLinkResult({ msg: `Bespoke invoice & checkout link (${typeDesc}) opened in WhatsApp!`, type: 'success', url: checkoutUrl });
      }
    } catch (err: any) {
      setPaymentLinkResult({ msg: err.message, type: 'error' });
    } finally {
      setSendingPaymentLink(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-foreground/40 mx-auto" />
          <p className="text-xs font-mono text-foreground/40 uppercase tracking-widest">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-mono text-red-400">{error || 'Booking not found'}</p>
          <button
            onClick={() => router.push('/admin/shoots')}
            className="px-4 py-2 bg-foreground text-background text-[10px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            Back to Shoots
          </button>
        </div>
      </div>
    );
  }

  const { depositPaid, remainingBalance, basePrice, addOnsTotal } = calculateBookingFinancials({
    total_price: booking.total_price || 0,
    add_ons: booking.add_ons || [],
  });

  const parsedBooking = parseBookingTier(booking.tier);
  const cleanTier = getCleanTierName(booking.tier);
  const categoryLabel = getCategoryLabel(booking.category);
  const isFullDay = booking.full_day || booking.slot === 'full_day';
  const startTime = getBookingStartTime(booking);
  const endTime = getBookingEndTime(booking);
  const timeDisplay = isFullDay
    ? 'Full Day Coverage (9:00 AM)'
    : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

  const [y, m, d] = booking.date.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const completionNote = booking.add_ons?.find((a) => String(a).startsWith('Completed:'));
  const displayAddOns = (booking.add_ons || []).filter(
    (a) => !String(a).startsWith('Completed:') && !String(a).startsWith('Note:')
  );
  const bookingNotes =
    booking.notes ||
    (booking.add_ons || []).find((a) => String(a).startsWith('Note:'))?.replace(/^Note:\s*/, '') ||
    '';

  const inputClasses =
    'w-full bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide focus:outline-none transition-colors';

  return (
    <div className="h-full flex flex-col bg-background text-foreground px-4 sm:px-8 lg:px-12 selection:bg-foreground/20 font-sans overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full min-h-0">
        {/* Fixed Content Header */}
        <div className="flex-none pt-8 pb-6 border-b border-foreground/15">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 text-foreground/40 font-mono text-[10px] uppercase tracking-[0.3em] mb-1 font-medium">
                <Camera className="w-3.5 h-3.5" /> Booking #{booking.paystack_reference || booking.id.slice(0, 8)}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-foreground">
                {booking.name}
              </h1>
              <p className="text-xs font-mono text-foreground/50 mt-1">
                {categoryLabel.toUpperCase()} — {parsedBooking.shootName ? `${parsedBooking.shootName} (${parsedBooking.tier})` : cleanTier} · {formattedDate}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push('/admin/shoots')}
                className="px-4 py-2.5 bg-foreground/[0.04] text-foreground border border-foreground/20 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/[0.08] transition-all flex items-center gap-2 rounded-none cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Shoots
              </button>

              {canEdit && !editing && (
                <button
                  onClick={startEditing}
                  className="px-4 py-2.5 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all shadow-sm flex items-center gap-2 rounded-none cursor-pointer font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              )}

              {/* Status Badge */}
              {isCompleted ? (
                <span className="text-[9px] uppercase tracking-[0.2em] px-3 py-2 border bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              ) : (
                <span
                  className={`text-[9px] uppercase tracking-[0.2em] px-3 py-2 border font-medium ${
                    booking.status === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : booking.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : booking.status === 'cancelled'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-foreground/10 text-foreground/50 border-foreground/20'
                  }`}
                >
                  {booking.status.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-6 space-y-6 font-mono pb-12 no-scrollbar">
          {/* Save Success Banner */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-emerald-400 text-[11px]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">Booking updated successfully!</span>
          </motion.div>
        )}

        {/* Title */}
        <div className="border-b border-foreground/10 pb-4">
          <p className="text-foreground/40 text-[9px] uppercase tracking-[0.3em] mb-1">
            Booking ID: {booking.id}
          </p>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-foreground">
            {booking.name} — {booking.category}
          </h1>
          {booking.paystack_reference && (
            <p className="text-foreground/30 text-[9px] font-mono mt-1">
              Paystack Ref: {booking.paystack_reference}
            </p>
          )}
        </div>

        {/* Main Grid: Details & Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Client & Shoot Details */}
          <div className="space-y-4">
            {/* Client Contact */}
            <div className="bg-foreground/[0.02] border border-foreground/10 p-4 space-y-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/40 font-semibold">
                Client Contact
              </p>

              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={inputClasses}
                    placeholder="Full Name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className={inputClasses}
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className={inputClasses}
                      placeholder="Phone"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-serif font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-foreground/40 shrink-0" />
                    {booking.name}
                  </p>
                  <p className="text-[11px] text-foreground/70 flex items-center gap-2">
                    <Mail className="w-3 h-3 text-foreground/40 shrink-0" />
                    <a href={`mailto:${booking.email}`} className="hover:underline">{booking.email}</a>
                  </p>
                  <p className="text-[11px] text-foreground/70 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-foreground/40 shrink-0" />
                    <a href={`tel:${booking.phone}`} className="hover:underline">{booking.phone}</a>
                  </p>
                </>
              )}
            </div>

            {/* Shoot Parameters */}
            <div className="bg-foreground/[0.02] border border-foreground/10 p-4 space-y-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/40 font-semibold">
                Shoot Parameters
              </p>

              {editing ? (
                <div className="space-y-3">
                  {/* Shoot Name / Project Title */}
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">
                      Shoot Name / Custom Title
                    </label>
                    <input
                      type="text"
                      value={editShootName}
                      onChange={(e) => setEditShootName(e.target.value)}
                      placeholder="e.g. Avery @ 5, Aunty Julie's Golden Jubilee, Summer Campaign"
                      className={inputClasses}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">
                        Type of Shoot (Category)
                      </label>
                      <Select
                        value={editForm.category || 'portraits'}
                        onValueChange={(val) => {
                          const cat = RATE_CATEGORIES.find((c) => c.id === val);
                          const availTiers = cat ? cat.tiers.map((t) => t.name) : ['Signature', 'Lux', 'Platinum', 'Custom'];
                          const newTier = availTiers.includes(editForm.tier || '') ? editForm.tier : availTiers[0];
                          setEditForm({ ...editForm, category: val, tier: newTier });
                        }}
                      >
                        <SelectTrigger className="w-full h-[35px] bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide rounded-none focus:outline-none focus:ring-0 shadow-none">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="border-foreground/20 bg-background rounded-none z-[350] font-mono text-[11px]">
                          {RATE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-none text-[11px] font-mono cursor-pointer">
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">
                        Tier
                      </label>
                      <Select
                        value={editForm.tier || 'Signature'}
                        onValueChange={(val) => setEditForm({ ...editForm, tier: val })}
                      >
                        <SelectTrigger className="w-full h-[35px] bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide rounded-none focus:outline-none focus:ring-0 shadow-none">
                          <SelectValue placeholder="Select Tier" />
                        </SelectTrigger>
                        <SelectContent className="border-foreground/20 bg-background rounded-none z-[350] font-mono text-[11px]">
                          {(() => {
                            const cat = RATE_CATEGORIES.find((c) => c.id === (editForm.category || 'portraits'));
                            const tiers = cat ? [...cat.tiers] : [];
                            if (editForm.tier && !tiers.some((t) => t.name === editForm.tier)) {
                              tiers.push({ name: editForm.tier, priceNum: 0 });
                            }
                            return tiers.map((t) => (
                              <SelectItem key={t.name} value={t.name} className="rounded-none text-[11px] font-mono cursor-pointer">
                                {t.name}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">Shoot Date</label>
                      <ChronoSelect
                        value={editForm.date ? new Date(editForm.date + 'T00:00:00') : undefined}
                        onChange={(d) => {
                          if (d) {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            setEditForm({ ...editForm, date: `${yyyy}-${mm}-${dd}` });
                          }
                        }}
                        disableAdvanceNotice={true}
                        allowSundays={true}
                        allowPastDates={true}
                        className="w-full h-[35px] border-foreground/20 bg-foreground/[0.03] text-[11px] font-mono rounded-none shadow-none focus:border-foreground"
                        placeholder="Select Shoot Date"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">Time Slot</label>
                      <Select
                        value={editForm.slot || 'morning'}
                        onValueChange={(val) =>
                          setEditForm({
                            ...editForm,
                            slot: val,
                            full_day: val === 'full_day',
                          })
                        }
                      >
                        <SelectTrigger className="w-full h-[35px] bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide rounded-none focus:outline-none focus:ring-0 shadow-none">
                          <SelectValue placeholder="Select Time Slot" />
                        </SelectTrigger>
                        <SelectContent className="border-foreground/20 bg-background rounded-none z-[350] font-mono text-[11px]">
                          <SelectItem value="morning" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Morning (9:00 AM)
                          </SelectItem>
                          <SelectItem value="afternoon" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Afternoon (1:00 PM)
                          </SelectItem>
                          <SelectItem value="sunset" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Sunset (4:30 PM)
                          </SelectItem>
                          <SelectItem value="full_day" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Full Day Coverage
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">Total Price (GHS)</label>
                      <input
                        type="number"
                        value={editForm.total_price || 0}
                        onChange={(e) => setEditForm({ ...editForm, total_price: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">Booking Status</label>
                      <Select
                        value={editForm.status || 'pending'}
                        onValueChange={(val) =>
                          setEditForm({
                            ...editForm,
                            status: val as BookingStatus,
                          })
                        }
                      >
                        <SelectTrigger className="w-full h-[35px] bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide rounded-none focus:outline-none focus:ring-0 shadow-none">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="border-foreground/20 bg-background rounded-none z-[350] font-mono text-[11px]">
                          <SelectItem value="pending" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Pending Deposit
                          </SelectItem>
                          <SelectItem value="confirmed" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Confirmed
                          </SelectItem>
                          <SelectItem value="completed" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Completed
                          </SelectItem>
                          <SelectItem value="cancelled" className="rounded-none text-[11px] font-mono cursor-pointer">
                            Cancelled
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-foreground/40 mb-1">Photographer Notes</label>
                    <textarea
                      rows={2}
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className={inputClasses}
                      placeholder="Special instructions, location details, etc."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Calendar className="w-3 h-3 text-foreground/40 shrink-0" />
                    <span className="text-foreground font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Clock className="w-3 h-3 text-foreground/40 shrink-0" />
                    <span className="text-foreground font-medium">{timeDisplay}</span>
                  </div>
                  {parsedBooking.shootName && (
                    <p className="text-foreground/80">
                      Shoot Name: <span className="text-foreground font-semibold">{parsedBooking.shootName}</span>
                    </p>
                  )}
                  <p className="text-foreground/80">
                    Type of Shoot: <span className="text-foreground font-medium">{categoryLabel}</span>
                  </p>
                  <p className="text-foreground/80">
                    Package Tier: <span className="text-foreground font-medium">{parsedBooking.tier}</span>
                  </p>
                  {bookingNotes && (
                    <div className="pt-2 border-t border-foreground/10">
                      <span className="text-[8px] uppercase tracking-wider text-foreground/40 block mb-0.5">Notes:</span>
                      <p className="text-foreground/70 italic text-[11px]">{bookingNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add-ons */}
            <div className="bg-foreground/[0.02] border border-foreground/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/40 font-semibold">
                  Selected Add-ons {editing && `(${editAddOns.length})`}
                </p>
                {editing && (
                  <span className="text-[9px] font-mono text-foreground/40">
                    Pricing updates automatically
                  </span>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  {/* Current edit add-ons list */}
                  {editAddOns.length > 0 ? (
                    <div className="space-y-1.5">
                      {editAddOns.map((addon, i) => {
                        const price = getAddOnPrice(addon);
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-foreground/[0.03] border border-foreground/15 text-[11px] font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-foreground/30 text-[10px] font-mono">#{i + 1}</span>
                              <span className="text-foreground font-medium">{formatAddOnName(addon)}</span>
                              {price > 0 && (
                                <span className="text-[10px] text-emerald-400 font-mono">
                                  +GHS {price.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddOn(i)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer rounded-none"
                              title="Remove add-on"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-foreground/30 font-mono italic">No add-ons currently added</p>
                  )}

                  {/* Add Add-on Controls */}
                  <div className="pt-2 border-t border-foreground/10 space-y-2">
                    <label className="block text-[8px] uppercase tracking-wider text-foreground/50 font-mono">
                      Add New Add-on
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={selectedAddOnToAdd}
                          onValueChange={(val) => setSelectedAddOnToAdd(val)}
                        >
                          <SelectTrigger className="w-full h-[35px] bg-foreground/[0.03] border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide rounded-none focus:outline-none focus:ring-0 shadow-none">
                            <SelectValue placeholder="-- Select an add-on to add --" />
                          </SelectTrigger>
                          <SelectContent className="border-foreground/20 bg-background rounded-none z-[350] font-mono text-[11px] max-h-60 overflow-y-auto">
                            {ALL_ADDONS.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="rounded-none text-[11px] font-mono cursor-pointer">
                                {a.name} (+GHS {a.price.toLocaleString()})
                              </SelectItem>
                            ))}
                            <SelectItem value="custom" className="rounded-none text-[11px] font-mono cursor-pointer text-emerald-400 font-semibold">
                              + Custom Add-on...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSelectedAddOn}
                        disabled={!selectedAddOnToAdd}
                        className="px-4 h-[35px] bg-foreground text-background font-mono text-[10px] uppercase tracking-wider font-semibold hover:bg-foreground/90 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 rounded-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Custom Add-on inline form */}
                    {showCustomAddOnInput && (
                      <div className="p-3 bg-foreground/[0.03] border border-emerald-500/30 space-y-2 mt-2">
                        <p className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold font-mono">
                          Enter Custom Add-on
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={customAddOnName}
                              onChange={(e) => setCustomAddOnName(e.target.value)}
                              placeholder="Add-on description"
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={customAddOnPrice || ''}
                              onChange={(e) => setCustomAddOnPrice(Number(e.target.value))}
                              placeholder="Price (GHS)"
                              className={inputClasses}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomAddOnInput(false);
                              setSelectedAddOnToAdd('');
                            }}
                            className="px-2.5 py-1 text-[10px] font-mono uppercase text-foreground/50 hover:text-foreground border border-foreground/20 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCustomAddOn}
                            disabled={!customAddOnName.trim()}
                            className="px-3 py-1 text-[10px] font-mono uppercase bg-emerald-600 text-white font-semibold hover:bg-emerald-500 cursor-pointer disabled:opacity-40"
                          >
                            Add Custom Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {displayAddOns.length > 0 ? (
                    <ul className="space-y-1">
                      {displayAddOns.map((addon, i) => {
                        const price = getAddOnPrice(addon);
                        return (
                          <li key={i} className="text-[11px] text-foreground/70 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-foreground/20">—</span>
                              <span>{formatAddOnName(addon)}</span>
                            </div>
                            {price > 0 && (
                              <span className="text-[10px] text-foreground/40 font-mono">
                                +GHS {price.toLocaleString()}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-foreground/30 font-mono">No add-ons selected</p>
                  )}
                  {completionNote && (
                    <div className="pt-2 border-t border-foreground/10 text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{completionNote}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Edit Actions */}
            {editing && (
              <div className="space-y-2">
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2.5 text-red-400 text-[10px] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {saveError}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-foreground text-background text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2.5 border border-foreground/20 text-foreground/60 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/[0.04] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Financial Ledger & Actions */}
          <div className="space-y-4">
            {/* Financial Summary */}
            <div className="bg-foreground/[0.03] border border-foreground/15 p-4 space-y-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/50 font-semibold">
                Financial Ledger
              </p>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between text-foreground/70">
                  <span>Base Package:</span>
                  <span>GHS {basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-foreground/70">
                  <span>Add-ons Total (100% upfront):</span>
                  <span>GHS {addOnsTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-foreground font-semibold pt-2 border-t border-foreground/10">
                  <span>Total Shoot Price:</span>
                  <span>GHS {booking.total_price.toLocaleString()}</span>
                </div>

                {isCompleted ? (
                  <>
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Total Settled & Paid:</span>
                      <span>GHS {Number(booking.total_price || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400 font-semibold pt-2 border-t border-emerald-500/20">
                      <span>Balance Due:</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        GHS 0 (Settled)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Deposit Paid Upfront:</span>
                      <span>GHS {depositPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-400 font-semibold pt-2 border-t border-foreground/15">
                      <span>Balance Due on Shoot:</span>
                      <span>GHS {remainingBalance.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Links Section */}
            {!isCompleted && booking.status !== 'cancelled' && (
              <div className="bg-foreground/[0.02] border border-foreground/15 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/60 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Client Payment Links
                  </span>
                  <span className="text-[8px] text-foreground/40">Paystack 1.95% fee</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={sendingPaymentLink !== null}
                    onClick={() => handleSendPaymentLink('deposit')}
                    className="w-full py-2.5 px-3 bg-foreground/[0.05] hover:bg-foreground/[0.1] text-foreground border border-foreground/25 text-[9px] uppercase tracking-[0.15em] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {sendingPaymentLink === 'deposit' ? 'Generating...' : `Deposit (GHS ${depositPaid.toLocaleString()})`}
                  </button>

                  <button
                    type="button"
                    disabled={sendingPaymentLink !== null}
                    onClick={() => handleSendPaymentLink('full')}
                    className="w-full py-2.5 px-3 bg-foreground text-background text-[9px] uppercase tracking-[0.15em] font-semibold hover:bg-foreground/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {sendingPaymentLink === 'full' ? 'Generating...' : `Full (GHS ${booking.total_price.toLocaleString()})`}
                  </button>
                </div>

                {paymentLinkResult && (
                  <div className={`text-[10px] p-2.5 border flex items-center gap-2 ${
                    paymentLinkResult.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {paymentLinkResult.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="font-medium">{paymentLinkResult.msg}</span>
                  </div>
                )}
              </div>
            )}

            {/* Completed Shoot Banner */}
            {isCompleted && (
              <div className="bg-emerald-500/[0.08] border border-emerald-500/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Shoot Completed & Financials Settled
                </div>
                <p className="text-[11px] text-foreground/70 leading-relaxed">
                  This session is complete. All outstanding balances have been settled.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!isCompleted && booking.status !== 'cancelled' && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const { remainingBalance: rb } = calculateBookingFinancials({
                      total_price: booking.total_price || 0,
                      add_ons: booking.add_ons || [],
                    });
                    setSettlementType(rb > 0 ? 'balance' : 'none');
                    setShowComplete(true);
                  }}
                  className="w-full py-3 bg-emerald-600 text-white text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Shoot & Record Payment
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="w-full py-2.5 px-3 bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground border border-foreground/25 text-[10px] uppercase tracking-[0.15em] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5 text-foreground/80" />
                  Email Client (Payment Link / Confirmation)
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${booking.name}, regarding your upcoming BYNK photography shoot...`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 border border-foreground/20 text-foreground/70 hover:text-foreground text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  <button
                    onClick={() => setShowCancel(true)}
                    className="py-2 px-3 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Cancel Shoot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete Shoot Inline Section */}
        {showComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-foreground/[0.02] border border-emerald-500/30 p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-serif text-foreground font-semibold">
                  Complete Shoot & Record Payment
                </h3>
              </div>
              <button onClick={() => setShowComplete(false)} className="text-foreground/40 hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settlement Type */}
            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-medium">
                Offline Payment Settlement Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'balance' as const, label: 'Remaining Balance', amount: `GHS ${remainingBalance.toLocaleString()}` },
                  { id: 'full' as const, label: 'Full Shoot Fee', amount: `GHS ${booking.total_price.toLocaleString()}` },
                  { id: 'none' as const, label: 'Already Settled', amount: 'No extra payment' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSettlementType(opt.id)}
                    className={`p-2.5 text-center border text-[10px] transition-all cursor-pointer ${
                      settlementType === opt.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                        : 'bg-foreground/[0.02] text-foreground/60 border-foreground/20 hover:border-foreground/40'
                    }`}
                  >
                    <span className="block font-bold">{opt.label}</span>
                    <span className="text-[9px] opacity-80">{opt.amount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            {settlementType !== 'none' && (
              <div className="space-y-2">
                <label className="block text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-medium">
                  Offline Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash' as const, label: 'Cash', icon: Banknote },
                    { id: 'momo' as const, label: 'Mobile Money', icon: Phone },
                    { id: 'bank_transfer' as const, label: 'Bank Transfer', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2 border text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === m.id
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

            {/* Notes */}
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
                onClick={() => setShowComplete(false)}
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Completion
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Cancel Confirmation */}
        {showCancel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-foreground/[0.02] border border-red-500/30 p-5 space-y-4"
          >
            <div className="flex items-center gap-3 text-red-400 border-b border-foreground/10 pb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-serif text-foreground font-semibold">
                Confirm Shoot Cancellation
              </h3>
            </div>

            <p className="text-xs text-foreground/70 leading-relaxed">
              Are you sure you want to cancel the shoot for <strong className="text-foreground">{booking.name}</strong> on <strong className="text-foreground">{formattedDate}</strong>?
            </p>

            <div className="bg-foreground/[0.03] border border-foreground/10 p-3 text-[10px] space-y-1">
              <p className="text-foreground/50 uppercase tracking-wider">Cancellation Terms:</p>
              <p className="text-foreground/70">• 50% Base package deposit is retained (non-refundable).</p>
              <p className="text-foreground/70">• Add-ons payments are refundable if cancelled at least 2 days before shoot.</p>
              <p className="text-emerald-400 font-semibold pt-1">• Cancelling will immediately free up this date slot.</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancel(false)}
                className="px-4 py-2 border border-foreground/20 text-[10px] uppercase tracking-wider hover:bg-foreground/5 transition-colors cursor-pointer"
              >
                Keep Shoot
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white text-[10px] uppercase tracking-wider font-semibold hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </motion.div>
        )}
        </div>
      </div>

      {/* Manual Email Dispatch Modal (Brevo) */}
      <SendShootEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        shoot={booking}
      />
    </div>
  );
}
