'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import {
  type Booking,
  formatTimeLabel,
  getTierDurationMinutes,
  toDateKey,
  getBookingStartTime,
  getBookingEndTime,
  calculateBookingFinancials,
} from '@/lib/booking-types';
import {
  createIcsContent,
  createGoogleCalendarUrl,
  downloadIcsFile,
} from '@/lib/ics-calendar';

export default function SchedulePage() {
  const [shoots, setShoots] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [copiedFeed, setCopiedFeed] = useState(false);

  const fetchShoots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/shoots?limit=100');
      if (!res.ok) {
        throw new Error('Failed to fetch schedule data');
      }
      const data = await res.json();
      setShoots(data.shoots || []);
    } catch (err: any) {
      console.error('Fetch schedule error:', err);
      setError(err.message || 'Could not load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShoots();
  }, [fetchShoots]);

  const todayStr = toDateKey(new Date());

  const filteredShoots = shoots.filter((shoot) => {
    if (filter === 'upcoming') {
      return shoot.date >= todayStr && shoot.status !== 'cancelled';
    }
    if (filter === 'completed') {
      return shoot.status === 'completed' || (shoot.date < todayStr && shoot.status !== 'cancelled');
    }
    return shoot.status !== 'cancelled';
  });

  // Export all filtered shoots to .ics
  const handleExportAllIcs = () => {
    if (filteredShoots.length === 0) return;
    const icsContent = createIcsContent(filteredShoots, false);
    downloadIcsFile(`BYNK_Photographer_Schedule_${todayStr}.ics`, icsContent);
  };

  // Copy live calendar subscription URL
  const handleCopyFeedUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const feedUrl = `${origin}/api/calendar/feed`;
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 3000);
  };

  // Download single shoot .ics
  const handleDownloadSingleIcs = (shoot: Booking) => {
    const icsContent = createIcsContent([shoot], false);
    const dateFormatted = shoot.date.replace(/-/g, '');
    const clientNameStr = shoot.name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadIcsFile(`BYNK_Shoot_${clientNameStr}_${dateFormatted}.ics`, icsContent);
  };

  return (
    <main className="relative z-10 h-screen max-h-screen bg-background text-foreground pt-24 pb-6 px-4 sm:px-8 lg:px-16 flex flex-col overflow-hidden selection:bg-foreground/20">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-foreground/[0.02] via-transparent to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col h-full overflow-hidden">
        {/* Fixed Header & Controls */}
        <div className="flex-none space-y-6 pb-4">
          {/* Header Title & Sync Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-foreground/15 pb-6">
            <div>
              <p className="text-foreground/50 text-[10px] font-mono uppercase tracking-[0.3em] mb-1 font-medium">
                Photographer Schedule & Device Sync
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-foreground">
                Bookings Schedule
              </h1>
            </div>

            {/* Sync & Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportAllIcs}
                disabled={filteredShoots.length === 0}
                className="px-4 py-2.5 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all shadow-sm flex items-center gap-2 rounded-none cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                Download All (.ics)
              </button>

              <button
                onClick={handleCopyFeedUrl}
                className="px-4 py-2.5 bg-foreground/[0.04] text-foreground border border-foreground/20 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/[0.08] transition-all flex items-center gap-2 rounded-none cursor-pointer"
              >
                {copiedFeed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFeed ? 'Feed URL Copied!' : 'Copy iCal Feed URL'}
              </button>

              <button
                onClick={fetchShoots}
                className="p-2.5 bg-foreground/[0.03] border border-foreground/20 text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                title="Refresh schedule"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Tabs & Stats Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-foreground/[0.02] border border-foreground/10 p-4">
            <div className="flex items-center gap-1">
              {(['upcoming', 'completed', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`
                    px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer
                    ${
                      filter === tab
                        ? 'bg-foreground text-background font-medium'
                        : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-mono text-foreground/50">
              Showing <span className="text-foreground font-semibold">{filteredShoots.length}</span> shoot{filteredShoots.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Scrollable Schedule Items Container */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 custom-scrollbar pb-6">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-foreground/40 tracking-wider uppercase">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-xs font-mono text-red-400">{error}</p>
          </div>
        ) : filteredShoots.length === 0 ? (
          <div className="py-20 border border-dashed border-foreground/20 text-center space-y-2">
            <CalendarIcon className="w-8 h-8 text-foreground/20 mx-auto" />
            <p className="text-xs font-mono text-foreground/40 uppercase tracking-widest">
              No {filter} shoots scheduled
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShoots.map((shoot) => {
              const [y, m, d] = shoot.date.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const isFullDay = shoot.full_day || shoot.slot === 'full_day';
              const startTime = getBookingStartTime(shoot);
              const endTime = getBookingEndTime(shoot);
              const timeDisplay = isFullDay
                ? 'Full Day Coverage (9:00 AM)'
                : `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`;

              const { depositPaid, remainingBalance } = calculateBookingFinancials({
                total_price: shoot.total_price || 0,
                add_ons: shoot.add_ons || [],
              });
              const googleCalUrl = createGoogleCalendarUrl(shoot, false);

              return (
                <motion.div
                  key={shoot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-foreground/[0.02] border border-foreground/15 hover:border-foreground/30 transition-all p-5 sm:p-6 space-y-4"
                >
                  {/* Top Bar: Date, Time & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-foreground/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-foreground text-background px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider uppercase">
                        {formattedDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-foreground/80">
                        <Clock className="w-3.5 h-3.5 text-foreground/50" />
                        <span>{timeDisplay}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border border-foreground/20 text-foreground/70">
                        {shoot.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Grid: Client Info & Package Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Client Info */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40">
                        Client Details
                      </p>
                      <h3 className="font-serif text-lg text-foreground font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-foreground/50 shrink-0" />
                        {shoot.name}
                      </h3>
                      <p className="text-[11px] font-mono text-foreground/60 flex items-center gap-2 pt-0.5">
                        <Mail className="w-3 h-3 text-foreground/40 shrink-0" />
                        {shoot.email}
                      </p>
                      <p className="text-[11px] font-mono text-foreground/60 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-foreground/40 shrink-0" />
                        {shoot.phone}
                      </p>
                    </div>

                    {/* Category & Package */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40">
                        Shoot Package
                      </p>
                      <p className="font-serif text-base text-foreground font-medium">
                        {shoot.category}
                      </p>
                      <p className="text-[11px] font-mono text-foreground/60">
                        Tier: <span className="text-foreground">{shoot.tier}</span>
                      </p>
                      {shoot.add_ons && shoot.add_ons.length > 0 && (
                        <p className="text-[10px] font-mono text-foreground/40">
                          Add-ons: {shoot.add_ons.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-1 bg-foreground/[0.03] border border-foreground/10 p-3">
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40">
                        Financial Summary
                      </p>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-foreground/60">Total:</span>
                        <span className="text-foreground font-medium">GHS {shoot.total_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-foreground/60">Deposit Paid:</span>
                        <span className="text-emerald-500 font-medium">GHS {depositPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono pt-1 border-t border-foreground/10">
                        <span className="text-foreground/60">Balance Due:</span>
                        <span className="text-foreground font-semibold">GHS {remainingBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Shoot Calendar Sync Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 text-[10px] font-mono">
                    <span className="text-foreground/40 uppercase tracking-wider">
                      Sync this shoot to calendar:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadSingleIcs(shoot)}
                        className="px-3 py-1.5 bg-foreground/[0.04] text-foreground border border-foreground/20 hover:bg-foreground/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Apple / iCal (.ics)
                      </button>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-foreground/[0.04] text-foreground border border-foreground/20 hover:bg-foreground/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Calendar
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
