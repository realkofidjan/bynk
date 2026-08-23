'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, Calendar, Clock, Phone, User, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, MessageSquare, RefreshCw } from 'lucide-react';
import { SLOT_LABELS, type Booking } from '@/lib/booking-types';

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

  // Email sending state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<{ id: string; msg: string; type: 'success' | 'error'; url?: string } | null>(null);

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
        const depositPaid = shoot.deposit_amount || 0;
        const remainingBalance = Math.max(0, shoot.total_price - depositPaid);

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

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-foreground/20 font-mono pt-20 sm:pt-24 pb-12">
      {/* Header Bar */}
      <header className="border-b border-foreground/10 bg-background/90 backdrop-blur-md px-6 sm:px-12 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-8 space-y-6">
        {/* Controls Row: Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/10 pb-4">
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
          <div className="space-y-4">
            {shoots.map((shoot) => {
              const depositPaid = shoot.deposit_amount || 0;
              const remainingBalance = Math.max(0, shoot.total_price - depositPaid);
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

                  {/* Bottom Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-foreground/10">
                    <a
                      href={`https://wa.me/${shoot.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${shoot.name}, regarding your upcoming BYNK photography shoot on ${formattedDate}...`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Chat on WhatsApp
                    </a>

                    {activeTab === 'upcoming' && remainingBalance > 0 && (
                      <button
                        onClick={() => handleSendWhatsAppLink(shoot)}
                        disabled={sendingEmailId === shoot.id}
                        className="px-4 py-2 bg-foreground text-background text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {sendingEmailId === shoot.id
                          ? 'Generating Link...'
                          : `Send 50% Balance via WhatsApp (GHS ${remainingBalance.toLocaleString()})`}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-foreground/10 text-xs">
                <span className="text-foreground/50">
                  Page {page} of {totalPages} ({totalCount} total shoots)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-foreground/20 hover:bg-foreground/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 border border-foreground/20 hover:bg-foreground/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
