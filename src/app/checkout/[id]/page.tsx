'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  CreditCard,
  Lock,
  ArrowRight,
  Loader2,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  X,
  Check,
} from 'lucide-react';

interface BookingCheckoutData {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  formattedDate: string;
  slot: string;
  slotLabel: string;
  category: string;
  categoryLabel: string;
  tier: string;
  shootName?: string;
  rawTier: string;
  status: string;
  notes?: string;
  totalPrice: number;
  basePrice: number;
  addOnsTotal: number;
  depositPaid: number;
  remainingBalance: number;
  chargeAmountGhs: number;
  paymentType: 'balance' | 'deposit' | 'full';
  paymentTypeTitle: string;
  deliverables: string[];
  itemizedAddOns: { id: string; name: string; price: number }[];
}

interface AppliedDiscount {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmountGhs: number;
  description?: string;
}

export default function ClientCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const searchParams = useSearchParams();
  const paymentTypeQuery = searchParams.get('type') || 'balance';

  const [data, setData] = useState<BookingCheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Discount code state
  const [discountInput, setDiscountInput] = useState('');
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  // Payment checkout state
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    async function loadCheckout() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/shoots/checkout?id=${bookingId}&type=${paymentTypeQuery}`);
        const result = await res.json();

        if (!res.ok || !result.booking) {
          throw new Error(result.error || 'Unable to load invoice and checkout information');
        }

        setData(result.booking);
      } catch (err: any) {
        console.error('Checkout fetch error:', err);
        setError(err.message || 'Error loading checkout');
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) {
      loadCheckout();
    }
  }, [bookingId, paymentTypeQuery]);

  const baseChargeAmount = data ? data.chargeAmountGhs : 0;

  // Apply discount calculation
  const discountDeduction = appliedDiscount ? appliedDiscount.discountAmountGhs : 0;
  const discountedSubtotal = Math.max(0, baseChargeAmount - discountDeduction);
  const payableTotalGhs = discountedSubtotal;

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountInput.trim()) return;

    try {
      setValidatingDiscount(true);
      setDiscountError('');

      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountInput.trim().toUpperCase(),
          amount: baseChargeAmount,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.valid) {
        throw new Error(result.error || 'Invalid discount code');
      }

      setAppliedDiscount({
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmountGhs: result.discountAmountGhs,
        description: result.description,
      });
      setDiscountInput('');
    } catch (err: any) {
      setDiscountError(err.message || 'Error validating code');
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError('');
  };

  const handleProceedToPayment = async () => {
    if (!data) return;

    try {
      setPaying(true);
      setPaymentError('');

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: data.id,
          email: data.email,
          totalPrice: data.totalPrice,
          basePriceGhs: baseChargeAmount,
          depositAmount: data.paymentType === 'deposit' ? baseChargeAmount : undefined,
          exactAmountGhs: discountedSubtotal,
          category: data.category,
          tier: data.rawTier,
          name: data.name,
          phone: data.phone,
          discountCode: appliedDiscount?.code,
          paymentType: data.paymentType,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.authorizationUrl) {
        throw new Error(result.error || 'Failed to initialize Paystack checkout. Please try again.');
      }

      // Redirect client to Paystack payment gateway
      window.location.href = result.authorizationUrl;
    } catch (err: any) {
      console.error('Payment checkout error:', err);
      setPaymentError(err.message || 'Error initializing payment. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] text-foreground flex items-center justify-center font-mono">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-foreground/40 mx-auto" />
          <p className="text-xs uppercase tracking-[0.25em] text-foreground/40">Loading your bespoke invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#070707] text-foreground flex items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full bg-[#0d0d0d] border border-foreground/15 p-6 space-y-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-base font-serif text-foreground font-semibold">Invoice Not Found</h2>
          <p className="text-xs text-foreground/60 leading-relaxed font-sans">
            {error || 'The requested checkout link is invalid or may have expired.'}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 border border-foreground/20 text-foreground text-xs uppercase tracking-widest hover:bg-foreground/[0.04] transition-colors"
          >
            Return to BYNK Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-foreground font-sans selection:bg-foreground selection:text-background py-8 sm:py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Brand Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-foreground/40 hover:text-foreground text-[10px] font-mono uppercase tracking-[0.3em] transition-colors mb-2"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>BYNK Photography</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground font-semibold">
              Session Invoice &amp; Checkout
            </h1>
            <p className="text-xs text-foreground/50 font-mono tracking-wide mt-1">
              Ref: <span className="text-foreground uppercase font-bold">{data.id.slice(0, 8)}</span> · {data.paymentTypeTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-foreground/[0.04] border border-foreground/20 text-[10px] font-mono uppercase tracking-widest text-foreground/70">
              {data.status === 'confirmed' ? 'Confirmed Shoot' : 'Pending Payment'}
            </span>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Shoot Details & Deliverables (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Client & Shoot Summary Card */}
            <div className="bg-[#0e0e0e] border border-foreground/15 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-foreground/40">
                  Client Booking Overview
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {data.categoryLabel}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-serif font-medium text-foreground">
                  {data.shootName ? `${data.tier} — ${data.shootName}` : data.tier}
                </h2>
                <p className="text-xs text-foreground/60 font-mono">Prepared for {data.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs text-foreground/80">
                <div className="bg-foreground/[0.02] border border-foreground/10 p-3">
                  <div className="flex items-center gap-1.5 text-foreground/40 text-[9px] uppercase tracking-wider mb-1">
                    <Calendar className="w-3 h-3 text-foreground/50" />
                    <span>Shoot Date</span>
                  </div>
                  <span className="font-semibold text-foreground text-xs">{data.formattedDate}</span>
                </div>

                <div className="bg-foreground/[0.02] border border-foreground/10 p-3">
                  <div className="flex items-center gap-1.5 text-foreground/40 text-[9px] uppercase tracking-wider mb-1">
                    <Clock className="w-3 h-3 text-foreground/50" />
                    <span>Scheduled Slot</span>
                  </div>
                  <span className="font-semibold text-foreground text-xs">{data.slotLabel}</span>
                </div>
              </div>
            </div>

            {/* Included Deliverables Card */}
            <div className="bg-[#0e0e0e] border border-foreground/15 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-foreground font-serif text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3>Included Package Deliverables</h3>
              </div>

              <ul className="space-y-2.5 text-xs text-foreground/75 font-sans">
                {data.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Add-ons list if any */}
              {data.itemizedAddOns.length > 0 && (
                <div className="pt-4 border-t border-foreground/10 space-y-2.5">
                  <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-foreground/40 block">
                    Selected Upgrades &amp; Add-ons
                  </span>
                  <div className="space-y-1.5 font-mono text-xs">
                    {data.itemizedAddOns.map((addon, idx) => (
                      <div key={idx} className="flex items-center justify-between text-foreground/80 bg-foreground/[0.02] px-3 py-1.5 border border-foreground/[0.08]">
                        <span className="text-[11px]">{addon.name}</span>
                        <span className="text-foreground font-semibold">
                          {addon.price > 0 ? `+ GHS ${addon.price.toLocaleString()}` : 'Included'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.notes && (
                <div className="pt-3 border-t border-foreground/10">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-foreground/40 block mb-1">
                    Session Notes
                  </span>
                  <p className="text-xs text-foreground/60 italic font-sans">{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Invoice Breakdown, Discount Code & Payment (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Invoice Breakdown Card */}
            <div className="bg-[#0e0e0e] border border-foreground/15 p-5 sm:p-6 space-y-5 font-mono">
              <div className="border-b border-foreground/10 pb-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 block">
                  Invoice Breakdown
                </span>
                <h3 className="text-sm font-semibold text-foreground mt-0.5">
                  Order Summary (GHS)
                </h3>
              </div>

              {/* Financial line items */}
              <div className="space-y-2.5 text-xs text-foreground/70">
                <div className="flex justify-between">
                  <span>Base Package ({data.tier}):</span>
                  <span className="text-foreground">GHS {data.basePrice.toLocaleString()}</span>
                </div>

                {data.addOnsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons Subtotal:</span>
                    <span className="text-foreground">+ GHS {data.addOnsTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-foreground/10">
                  <span>Total Shoot Price:</span>
                  <span>GHS {data.totalPrice.toLocaleString()}</span>
                </div>

                {/* If paying balance, show deposit already settled */}
                {data.paymentType === 'balance' && data.depositPaid > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Initial Deposit Paid:</span>
                    <span>- GHS {data.depositPaid.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-foreground/10">
                  <span>Subtotal for this Payment:</span>
                  <span>GHS {baseChargeAmount.toLocaleString()}</span>
                </div>

                {/* Applied Discount Display */}
                {appliedDiscount && (
                  <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/10 p-2 border border-emerald-500/20">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="font-bold">{appliedDiscount.code}</span>
                      <span className="text-[10px] opacity-80">
                        ({appliedDiscount.discountType === 'percentage' ? `${appliedDiscount.discountValue}%` : `GHS ${appliedDiscount.discountValue}`})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">- GHS {appliedDiscount.discountAmountGhs.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="text-foreground/40 hover:text-red-400 transition-colors p-0.5"
                        title="Remove discount"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Due Pill */}
              <div className="bg-foreground/[0.04] border border-foreground/20 p-4 space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-foreground/50 block">
                  Total Payable Now
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
                  GHS {payableTotalGhs.toLocaleString()}
                </div>
                <span className="text-[9px] text-foreground/40 block font-sans">
                  Encrypted Checkout · Mobile Money, Ghana Cards &amp; Apple Pay.
                </span>
              </div>

              {/* Discount Code Input Box */}
              {!appliedDiscount && (
                <form onSubmit={handleApplyDiscount} className="space-y-2 pt-2 border-t border-foreground/10">
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/50">
                    Have a Discount / Promo Code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                      className="flex-1 h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 text-xs uppercase font-bold text-foreground tracking-widest focus:outline-none focus:border-foreground rounded-none font-mono"
                    />
                    <button
                      type="submit"
                      disabled={validatingDiscount || !discountInput.trim()}
                      className="px-4 h-[38px] bg-foreground/10 hover:bg-foreground/20 text-foreground border border-foreground/20 text-[10px] uppercase tracking-widest font-semibold transition-colors disabled:opacity-50 cursor-pointer font-mono"
                    >
                      {validatingDiscount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>

                  {discountError && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{discountError}</span>
                    </p>
                  )}
                </form>
              )}

              {paymentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Pay Button CTA */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  disabled={paying}
                  onClick={handleProceedToPayment}
                  className="w-full py-3.5 bg-foreground text-background text-xs uppercase tracking-[0.2em] font-semibold hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing checkout...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay GHS {payableTotalGhs.toLocaleString()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="text-center space-y-1.5 pt-1">
                  <div className="flex items-center justify-center gap-3 text-[10px] text-foreground/40">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      256-bit SSL Encrypted
                    </span>
                    <span>·</span>
                    <span>Instant Receipt</span>
                  </div>
                  <p className="text-[9px] text-foreground/35 font-sans">
                    Supports Mobile Money (MTN, Telecel, AT), Ghana Cards &amp; Apple Pay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
