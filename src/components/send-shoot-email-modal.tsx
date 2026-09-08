'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileCheck,
  MessageSquare,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { calculateBookingFinancials } from '@/lib/booking-types';

export interface SendShootEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoot: {
    id: string;
    name: string;
    email: string;
    date: string;
    tier: string;
    category?: string;
    total_price: number;
    add_ons?: string[];
  } | null;
  onSuccess?: (msg: string) => void;
}

export function SendShootEmailModal({
  isOpen,
  onClose,
  shoot,
  onSuccess,
}: SendShootEmailModalProps) {
  const [emailType, setEmailType] = useState<'payment_reminder' | 'booking_confirmation' | 'custom_message'>('payment_reminder');
  const [paymentType, setPaymentType] = useState<'balance' | 'deposit' | 'full'>('balance');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    msg: string;
    provider?: string;
    url?: string;
  } | null>(null);

  if (!isOpen || !shoot) return null;

  const { depositPaid, remainingBalance } = calculateBookingFinancials({
    total_price: shoot.total_price || 0,
    add_ons: shoot.add_ons || [],
  });

  const [y, m, d] = (shoot.date || '').split('-').map(Number);
  const formattedDate = shoot.date ? new Date(y, m - 1, d).toDateString() : 'Scheduled Date';

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/shoots/manual-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: shoot.id,
          emailType,
          paymentType,
          customSubject,
          customMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch email');
      }

      setResult({
        type: 'success',
        msg: data.message || 'Email successfully delivered!',
        provider: data.provider,
        url: data.authorizationUrl,
      });

      if (onSuccess) {
        onSuccess(data.message || 'Email sent successfully');
      }
    } catch (err: any) {
      setResult({
        type: 'error',
        msg: err.message || 'Error occurred while sending email',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
        onClick={() => !sending && onClose()}
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none bg-foreground/10 border border-foreground/20 flex items-center justify-center text-foreground">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-mono">
                  Brevo · Manual Email Dispatch
                </p>
                <h3 className="text-sm font-medium tracking-wide text-foreground">
                  Send Email to {shoot.name}
                </h3>
              </div>
            </div>
            <button
              onClick={() => !sending && onClose()}
              className="text-foreground/40 hover:text-foreground p-1 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Client summary pill */}
          <div className="bg-foreground/[0.03] border border-foreground/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div>
              <span className="text-foreground/40 block text-[9px] uppercase tracking-wider">Recipient</span>
              <span className="text-foreground font-medium">{shoot.email}</span>
            </div>
            <div className="text-right">
              <span className="text-foreground/40 block text-[9px] uppercase tracking-wider">Shoot</span>
              <span className="text-foreground">{formattedDate} ({shoot.tier})</span>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase tracking-widest text-foreground/50 font-mono">
              Email Template / Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmailType('payment_reminder');
                  setResult(null);
                }}
                className={`p-2.5 text-left border transition-all cursor-pointer rounded-none ${
                  emailType === 'payment_reminder'
                    ? 'border-foreground bg-foreground/10 text-foreground font-medium'
                    : 'border-foreground/15 bg-foreground/[0.02] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                <div className="text-[10px] uppercase tracking-wider font-semibold">Payment Link</div>
                <div className="text-[8px] text-foreground/40">Balance or deposit</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailType('booking_confirmation');
                  setResult(null);
                }}
                className={`p-2.5 text-left border transition-all cursor-pointer rounded-none ${
                  emailType === 'booking_confirmation'
                    ? 'border-foreground bg-foreground/10 text-foreground font-medium'
                    : 'border-foreground/15 bg-foreground/[0.02] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 mb-1 text-blue-400" />
                <div className="text-[10px] uppercase tracking-wider font-semibold">Confirmation</div>
                <div className="text-[8px] text-foreground/40">Resend shoot receipt</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailType('custom_message');
                  setResult(null);
                }}
                className={`p-2.5 text-left border transition-all cursor-pointer rounded-none ${
                  emailType === 'custom_message'
                    ? 'border-foreground bg-foreground/10 text-foreground font-medium'
                    : 'border-foreground/15 bg-foreground/[0.02] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 mb-1 text-amber-400" />
                <div className="text-[10px] uppercase tracking-wider font-semibold">Custom Note</div>
                <div className="text-[8px] text-foreground/40">Branded email update</div>
              </button>
            </div>
          </div>

          {/* Conditional Options */}
          {emailType === 'payment_reminder' && (
            <div className="space-y-3 bg-foreground/[0.02] border border-foreground/15 p-3.5">
              <label className="block text-[9px] uppercase tracking-widest text-foreground/60 font-mono">
                Select Payment Amount Due
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('balance')}
                  className={`p-2 text-left border rounded-none cursor-pointer transition-all ${
                    paymentType === 'balance'
                      ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                      : 'border-foreground/15 text-foreground/70 hover:border-foreground/30'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-widest text-emerald-400">Balance Due</span>
                  <span className="text-xs font-mono font-bold">GHS {remainingBalance.toLocaleString()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('deposit')}
                  className={`p-2 text-left border rounded-none cursor-pointer transition-all ${
                    paymentType === 'deposit'
                      ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                      : 'border-foreground/15 text-foreground/70 hover:border-foreground/30'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-widest text-foreground/50">Initial Deposit</span>
                  <span className="text-xs font-mono font-bold">GHS {depositPaid.toLocaleString()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`p-2 text-left border rounded-none cursor-pointer transition-all ${
                    paymentType === 'full'
                      ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-semibold'
                      : 'border-foreground/15 text-foreground/70 hover:border-foreground/30'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-widest text-foreground/50">Total Amount</span>
                  <span className="text-xs font-mono font-bold">GHS {shoot.total_price.toLocaleString()}</span>
                </button>
              </div>
              <p className="text-[10px] text-foreground/50 font-mono">
                Generates a bespoke invoice &amp; checkout link where the client can review deliverables, enter discount codes, and pay securely via Paystack.
              </p>
            </div>
          )}

          {emailType === 'booking_confirmation' && (
            <div className="bg-foreground/[0.02] border border-foreground/15 p-3.5 space-y-2 text-xs">
              <p className="text-[10px] text-foreground/70 leading-relaxed font-mono">
                This will resend the official BYNK confirmation email to <strong>{shoot.email}</strong>, containing the reference code ({shoot.id.slice(0, 8).toUpperCase()}), shoot date, location, breakdown, and portal lookup link.
              </p>
            </div>
          )}

          {emailType === 'custom_message' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-foreground/50 font-mono mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g., Important update regarding your upcoming photo session"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full h-[36px] bg-foreground/[0.04] border border-foreground/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground rounded-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-foreground/50 font-mono mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  placeholder="Write your note to the client here. It will be wrapped in the official BYNK Photography email template."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-foreground/[0.04] border border-foreground/20 p-3 text-xs text-foreground focus:outline-none focus:border-foreground rounded-none font-mono resize-none"
                />
              </div>
            </div>
          )}

          {/* Feedback Notice */}
          {result && (
            <div
              className={`p-3 border text-xs space-y-2 ${
                result.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {result.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{result.msg}</span>
              </div>

              {result.provider && (
                <div className="text-[9px] uppercase tracking-wider text-foreground/60 font-mono">
                  Delivered via: <span className="text-foreground uppercase font-bold">{result.provider}</span>
                </div>
              )}

              {result.url && (
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.url!);
                      alert('Paystack payment link copied to clipboard!');
                    }}
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-mono border border-emerald-500/30"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Payment Link
                  </button>

                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-foreground/10 hover:bg-foreground/20 text-foreground text-[9px] uppercase tracking-wider flex items-center gap-1 font-mono"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Paystack
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-foreground/10">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors cursor-pointer border border-transparent font-mono"
            >
              Close
            </button>

            <button
              type="button"
              disabled={sending || (emailType === 'custom_message' && (!customSubject || !customMessage))}
              onClick={handleSend}
              className="px-5 py-2.5 bg-foreground text-background text-[10px] uppercase tracking-widest font-semibold hover:bg-foreground/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 font-mono shadow-md"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending via Brevo...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
