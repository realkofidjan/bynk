'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Calendar,
  DollarSign,
  Percent,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { DiscountCode, DiscountType } from '@/lib/booking-types';

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [minSpend, setMinSpend] = useState<number | ''>('');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/discounts');
      const data = await res.json();

      if (data.tableMissing) {
        setTableMissing(true);
        setDiscounts([]);
      } else {
        setTableMissing(false);
        setDiscounts(data.discounts || []);
      }
    } catch (err) {
      console.error('Failed to load discounts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCopy = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (discount: DiscountCode) => {
    try {
      const res = await fetch('/api/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: discount.id, is_active: !discount.is_active }),
      });
      if (res.ok) {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === discount.id ? { ...d, is_active: !d.is_active } : d))
        );
      }
    } catch (err) {
      console.error('Toggle discount error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/discounts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!code.trim()) {
      setModalError('Please enter a discount code');
      return;
    }

    if (!discountValue || Number(discountValue) <= 0) {
      setModalError('Please enter a valid discount value greater than 0');
      return;
    }

    if (discountType === 'percentage' && Number(discountValue) > 100) {
      setModalError('Percentage discount cannot exceed 100%');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          discount_type: discountType,
          discount_value: Number(discountValue),
          min_spend: minSpend ? Number(minSpend) : 0,
          max_uses: maxUses ? Number(maxUses) : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create discount code');
      }

      setShowModal(false);
      // Reset form
      setCode('');
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('');
      setMinSpend('');
      setMaxUses('');
      setExpiresAt('');
      await fetchDiscounts();
    } catch (err: any) {
      setModalError(err.message || 'Error creating discount code');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const activeCodesCount = discounts.filter((d) => d.is_active).length;
  const totalRedemptions = discounts.reduce((acc, d) => acc + (d.used_count || 0), 0);

  return (
    <div className="min-h-full p-4 sm:p-8 space-y-6 font-mono max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-foreground/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-foreground/40 text-[9px] uppercase tracking-[0.25em] mb-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Promotion &amp; Checkout Vouchers</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-foreground font-semibold">
            Discount Codes
          </h1>
          <p className="text-xs text-foreground/50 tracking-wide font-sans mt-0.5">
            Manage custom promo codes that clients can apply during booking and invoice checkout.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDiscounts();
            }}
            disabled={refreshing}
            className="p-2 border border-foreground/20 text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-foreground text-background text-xs uppercase tracking-[0.15em] font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Discount</span>
          </button>
        </div>
      </div>

      {/* Database Notice if tableMissing */}
      {tableMissing && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Supabase Setup Required</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            The <code className="px-1.5 py-0.5 bg-black/40 rounded">discount_codes</code> table has not been created yet in your Supabase database.
            Please open your Supabase SQL Editor and run the SQL migration script located in <code className="px-1.5 py-0.5 bg-black/40 rounded">supabase/discounts.sql</code>.
          </p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-foreground/[0.02] border border-foreground/15 p-4 space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-foreground/40 block">Active Codes</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-baseline gap-2">
            <span>{activeCodesCount}</span>
            <span className="text-[10px] text-foreground/40 font-normal">/ {discounts.length} total</span>
          </div>
        </div>

        <div className="bg-foreground/[0.02] border border-foreground/15 p-4 space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-foreground/40 block">Total Redemptions</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {totalRedemptions}
          </div>
        </div>

        <div className="bg-foreground/[0.02] border border-foreground/15 p-4 space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-foreground/40 block">Checkout Integration</span>
          <div className="text-xs text-foreground/70 font-sans pt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Active on Bespoke Checkout &amp; /book</span>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-foreground/[0.02] border border-foreground/15">
        <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-foreground/70 font-semibold">
            All Promotional Codes
          </span>
          <span className="text-[10px] text-foreground/40">
            {discounts.length} {discounts.length === 1 ? 'code' : 'codes'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-foreground/40 mx-auto" />
            <p className="text-xs text-foreground/40 uppercase tracking-widest">Loading discount codes...</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="w-8 h-8 text-foreground/20 mx-auto" />
            <p className="text-xs uppercase tracking-wider text-foreground/40">No discount codes created yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
            >
              Create your first discount code &rarr;
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-foreground/10 text-[9px] uppercase tracking-widest text-foreground/40 bg-foreground/[0.01]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Min. Spend</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.06]">
                {discounts.map((d) => {
                  const isExpired = d.expires_at ? new Date(d.expires_at).getTime() < Date.now() : false;
                  const isExhausted = d.max_uses != null && d.used_count >= d.max_uses;

                  return (
                    <tr key={d.id} className="hover:bg-foreground/[0.02] transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-foreground/10 border border-foreground/20 text-foreground text-xs font-mono tracking-wider">
                            {d.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(d.code)}
                            className="text-foreground/40 hover:text-foreground transition-colors p-1"
                            title="Copy code"
                          >
                            {copiedCode === d.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {d.description && (
                          <span className="block text-[10px] text-foreground/40 font-sans font-normal mt-0.5">
                            {d.description}
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-400 font-semibold">
                          {d.discount_type === 'percentage' ? `${d.discount_value}% OFF` : `GHS ${d.discount_value.toLocaleString()} OFF`}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4 font-mono">
                        <span>{d.used_count || 0}</span>
                        <span className="text-foreground/40">
                          {d.max_uses ? ` / ${d.max_uses}` : ' / ∞'}
                        </span>
                        {isExhausted && (
                          <span className="block text-[8px] text-amber-400 uppercase tracking-wider font-semibold">Limit Reached</span>
                        )}
                      </td>

                      {/* Min Spend */}
                      <td className="py-3.5 px-4 font-mono text-foreground/70">
                        {d.min_spend > 0 ? `GHS ${d.min_spend.toLocaleString()}` : 'None'}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {d.expires_at ? (
                          <span className={isExpired ? 'text-red-400 font-semibold' : 'text-foreground/70'}>
                            {new Date(d.expires_at).toLocaleDateString()} {isExpired ? '(Expired)' : ''}
                          </span>
                        ) : (
                          <span className="text-foreground/40">No expiry</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(d)}
                          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border font-mono cursor-pointer transition-colors ${
                            d.is_active && !isExpired && !isExhausted
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-foreground/5 text-foreground/40 border-foreground/15 hover:bg-foreground/10'
                          }`}
                        >
                          {d.is_active && !isExpired && !isExhausted ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={deletingId === d.id}
                          onClick={() => handleDelete(d.id)}
                          className="text-foreground/30 hover:text-red-400 p-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Code"
                        >
                          {deletingId === d.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Discount Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !submitting && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#0c0c0c] border border-foreground/20 p-6 rounded-none space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-none bg-foreground/10 border border-foreground/20 flex items-center justify-center text-foreground">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-mono">
                      BYNK Photography · Promotions
                    </p>
                    <h3 className="text-base font-serif font-semibold text-foreground">
                      Create Discount Code
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setShowModal(false)}
                  className="text-foreground/40 hover:text-foreground p-1 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
                {/* Code input */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP20, BRIDAL15, WELCOME"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground font-bold tracking-widest uppercase focus:outline-none focus:border-foreground rounded-none"
                  />
                  <span className="text-[9px] text-foreground/40 mt-1 block">
                    Clients will enter this code at checkout to claim the discount.
                  </span>
                </div>

                {/* Type toggle */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1.5">
                    Discount Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`p-2.5 border text-left transition-all cursor-pointer ${
                        discountType === 'percentage'
                          ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                          : 'border-foreground/15 text-foreground/60 hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Percent className="w-3.5 h-3.5" />
                        <span>Percentage (%)</span>
                      </div>
                      <span className="text-[9px] text-foreground/40 block mt-0.5">e.g. 10% off total</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`p-2.5 border text-left transition-all cursor-pointer ${
                        discountType === 'fixed'
                          ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                          : 'border-foreground/15 text-foreground/60 hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Fixed Amount (GHS)</span>
                      </div>
                      <span className="text-[9px] text-foreground/40 block mt-0.5">e.g. GHS 150 off</span>
                    </button>
                  </div>
                </div>

                {/* Value input */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                    {discountType === 'percentage' ? 'Percentage Discount (%) *' : 'Discount Value (GHS) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={discountType === 'percentage' ? 100 : undefined}
                    placeholder={discountType === 'percentage' ? '15' : '200'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground font-bold focus:outline-none focus:border-foreground rounded-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                    Internal Note / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special promo for September bridal clients"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground focus:outline-none focus:border-foreground rounded-none font-sans text-xs"
                  />
                </div>

                {/* Minimum spend & Max uses */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                      Min. Spend (GHS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 (No minimum)"
                      value={minSpend}
                      onChange={(e) => setMinSpend(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground focus:outline-none focus:border-foreground rounded-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                      Max Redemptions
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground focus:outline-none focus:border-foreground rounded-none"
                    />
                  </div>
                </div>

                {/* Expiration date */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full h-[38px] bg-foreground/[0.04] border border-foreground/20 px-3 py-2 text-foreground focus:outline-none focus:border-foreground rounded-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-foreground/10">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-foreground text-background text-[10px] uppercase tracking-widest font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Discount Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
