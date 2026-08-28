'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  User,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import {
  ADDON_NAME_MAP,
  ADDON_PRICES,
  formatTimeLabel,
  minutesToTime,
} from '@/lib/booking-types';
import { ChronoSelect } from '@/components/ui/chrono-select';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface CustomOrderCreatorProps {
  onOrderCreated?: () => void;
  onViewShoots?: () => void;
}

interface CustomAddonItem {
  id: string;
  name: string;
  price: number;
}

export interface RateTier {
  name: string;
  priceNum: number;
  durationMinutes: number;
  features: string[];
  fullDay?: boolean;
}

export interface RateCategory {
  id: string;
  label: string;
  tiers: RateTier[];
}

export const RATE_CATEGORIES: RateCategory[] = [
  {
    id: 'portraits',
    label: 'Studio Portraits',
    tiers: [
      {
        name: 'Signature',
        priceNum: 1000,
        durationMinutes: 60,
        features: [
          'Professional studio setup',
          'Guided posing & creative direction',
          '10 edited · 5 retouched images',
          'Private online gallery',
        ],
      },
      {
        name: 'Lux',
        priceNum: 1500,
        durationMinutes: 90,
        features: [
          'Creative lighting variations',
          'Guided posing & direction',
          '20 edited · 10 retouched images',
          '5 preview images within 48 hours',
        ],
      },
      {
        name: 'Platinum',
        priceNum: 2200,
        durationMinutes: 150,
        features: [
          'Multiple lighting setups & background variation',
          'Full creative direction',
          '30 edited · 15 retouched images',
          '5 priority images within 48 hours',
        ],
      },
      {
        name: 'Custom',
        priceNum: 1500,
        durationMinutes: 90,
        features: ['Custom studio portraiture tailored to client specifications.'],
      },
    ],
  },
  {
    id: 'location-portraits',
    label: 'Location Portraits',
    tiers: [
      {
        name: 'Signature',
        priceNum: 1400,
        durationMinutes: 60,
        features: [
          '1 location · 1 outfit',
          'Professional portable lighting setup',
          '10 edited · 5 retouched images',
        ],
      },
      {
        name: 'Lux',
        priceNum: 1900,
        durationMinutes: 90,
        features: [
          '1–2 locations · 2 outfits',
          'Professional portable lighting',
          '20 edited · 10 retouched images',
          '5 preview images within 48 hours',
        ],
      },
      {
        name: 'Platinum',
        priceNum: 2800,
        durationMinutes: 150,
        features: [
          'Up to 2 locations · 3 outfits',
          'Full creative direction & multiple setups',
          '30 edited · 15 retouched images',
          '5 priority images within 48 hours',
        ],
      },
      {
        name: 'Custom',
        priceNum: 2000,
        durationMinutes: 90,
        features: ['Custom location shoot with tailored requirements.'],
      },
    ],
  },
  {
    id: 'weddings',
    label: 'Weddings',
    tiers: [
      {
        name: 'Signature',
        priceNum: 3800,
        durationMinutes: 360,
        fullDay: true,
        features: [
          'Up to 6 hours · 1 photographer',
          'Getting-ready & ceremony coverage',
          '250+ edited · 20 retouched images',
        ],
      },
      {
        name: 'Lux',
        priceNum: 5500,
        durationMinutes: 480,
        fullDay: true,
        features: [
          'Up to 8 hours · 1 lead photographer',
          'Full ceremony & reception coverage',
          '350+ edited · 35 retouched images',
          'Sneak-peek collection within 72 hours',
        ],
      },
      {
        name: 'Platinum',
        priceNum: 7500,
        durationMinutes: 600,
        fullDay: true,
        features: [
          'Up to 10 hours · 2 photographers',
          'Full wedding coverage & portraits',
          '500+ edited · 50 retouched images',
          '20-page premium album + framed print',
        ],
      },
      {
        name: 'Custom',
        priceNum: 6000,
        durationMinutes: 480,
        fullDay: true,
        features: ['Custom wedding package.'],
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    tiers: [
      {
        name: 'Signature (Half Day)',
        priceNum: 1600,
        durationMinutes: 240,
        features: [
          'Up to 4 hours · Half Day · 1 photographer',
          'Event & key moments coverage',
          '200+ edited · 15 retouched images',
        ],
      },
      {
        name: 'Lux (Half Day)',
        priceNum: 2600,
        durationMinutes: 360,
        features: [
          'Up to 6 hours · Half Day · 1 photographer',
          'Full event & stage coverage',
          '300+ edited · 25 retouched images',
        ],
      },
      {
        name: 'Platinum (Full Day)',
        priceNum: 3800,
        durationMinutes: 480,
        fullDay: true,
        features: [
          'Up to 8 hours · Full Day · 2 photographers',
          'Full event & behind-the-scenes coverage',
          '450+ edited · 40 retouched images',
          'Same-day preview collection',
        ],
      },
      {
        name: 'Custom',
        priceNum: 2500,
        durationMinutes: 240,
        features: ['Custom event photography coverage.'],
      },
    ],
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    tiers: [
      {
        name: 'Signature',
        priceNum: 1200,
        durationMinutes: 60,
        features: [
          'Standard apartment / 1–3 bedroom residential',
          'Interior & exterior photography',
          '15 edited high-resolution images',
        ],
      },
      {
        name: 'Lux',
        priceNum: 1800,
        durationMinutes: 90,
        features: [
          '4–5 bedroom home / commercial space',
          'Wide-angle interior & exterior photography',
          '25 edited high-resolution images',
          'Twilight exterior shots included',
        ],
      },
      {
        name: 'Platinum',
        priceNum: 2800,
        durationMinutes: 150,
        features: [
          'Luxury estates / commercial developments',
          'Full interior, exterior & architectural details',
          '40 edited high-resolution images',
          'Short video walkthrough reel included',
        ],
      },
      {
        name: 'Custom',
        priceNum: 2000,
        durationMinutes: 90,
        features: ['Custom architectural & property photography.'],
      },
    ],
  },
  {
    id: 'custom',
    label: 'Bespoke / Custom',
    tiers: [
      {
        name: 'Custom Package',
        priceNum: 1500,
        durationMinutes: 90,
        features: ['Tailored photography package designed specifically for client.'],
      },
    ],
  },
];

const PACKAGE_PRESETS = [
  'Custom Editorial Lookbook',
  'Private Studio Portraiture',
  'VIP Wedding & Reception Coverage',
  'Commercial Brand Campaign',
  'Corporate & Executive Headshots',
  'Exclusive Birthday / Event Session',
];

export default function CustomOrderCreator({
  onOrderCreated,
  onViewShoots,
}: CustomOrderCreatorProps) {
  // Client Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Shoot Details
  const [category, setCategory] = useState<string>('portraits');
  const [selectedTier, setSelectedTier] = useState<string>('Signature');
  const [packageTitle, setPackageTitle] = useState('Studio Portraits — Signature');
  const [basePackagePrice, setBasePackagePrice] = useState<number>(1000);
  
  // Default to tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDateStr);

  const [timeSlot, setTimeSlot] = useState('11:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('11:00 AM – 2:00 PM');
  const [fullDay, setFullDay] = useState(false);
  const [notes, setNotes] = useState('Professional studio setup\n• Guided posing & creative direction\n• 10 edited · 5 retouched images\n• Private online gallery');

  // Add-ons & Custom Line Items
  const [selectedStandardAddons, setSelectedStandardAddons] = useState<string[]>([]);
  const [customAddons, setCustomAddons] = useState<CustomAddonItem[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  // Derived Add-on Totals
  const standardAddonsTotal = React.useMemo(() => {
    return selectedStandardAddons.reduce((sum, k) => sum + (ADDON_PRICES[k] || 0), 0);
  }, [selectedStandardAddons]);

  const customAddonsTotal = React.useMemo(() => {
    return customAddons.reduce((sum, c) => sum + (c.price || 0), 0);
  }, [customAddons]);

  const allAddonsTotal = standardAddonsTotal + customAddonsTotal;

  // Pricing & Payment Configuration
  const [totalPriceOverride, setTotalPriceOverride] = useState<number | null>(null);
  const totalNum = totalPriceOverride !== null ? totalPriceOverride : (basePackagePrice + allAddonsTotal);
  const totalPrice = totalNum;

  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'paid_offline'>('deposit');
  const [customDepositAmount, setCustomDepositAmount] = useState<number | ''>(500);
  const [isCustomDepositInput, setIsCustomDepositInput] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Handle Category Change
  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    const cat = RATE_CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.tiers.length > 0) {
      const defaultTier = cat.tiers[0];
      setSelectedTier(defaultTier.name);
      setPackageTitle(`${cat.label} — ${defaultTier.name}`);
      setBasePackagePrice(defaultTier.priceNum);
      setTotalPriceOverride(null);
      setIsCustomDepositInput(false);
      setCustomDepositAmount(Math.round(defaultTier.priceNum / 2) + allAddonsTotal);
      setDurationMinutes(defaultTier.durationMinutes);
      setFullDay(Boolean(defaultTier.fullDay));
      setNotes(defaultTier.features.join('\n• '));
    }
  };

  // Handle Tier Change
  const handleTierChange = (tierName: string) => {
    setSelectedTier(tierName);
    const cat = RATE_CATEGORIES.find((c) => c.id === category);
    const tierObj = cat?.tiers.find((t) => t.name === tierName);
    if (tierObj) {
      setPackageTitle(`${cat?.label} — ${tierObj.name}`);
      setBasePackagePrice(tierObj.priceNum);
      setTotalPriceOverride(null);
      setIsCustomDepositInput(false);
      setCustomDepositAmount(Math.round(tierObj.priceNum / 2) + allAddonsTotal);
      setDurationMinutes(tierObj.durationMinutes);
      setFullDay(Boolean(tierObj.fullDay));
      setNotes(tierObj.features.join('\n• '));
    }
  };

  // Generate time slots exactly matching the /book component
  const standardSlots = React.useMemo(() => {
    const slots = [];
    const startMins = 9 * 60; // 09:00 AM
    const endMins = 19 * 60; // 07:00 PM

    for (let current = startMins; current + durationMinutes <= endMins; current += 30) {
      const timeStr = minutesToTime(current);
      const label = formatTimeLabel(current);
      const endMinsVal = current + durationMinutes;
      const endLabel = formatTimeLabel(endMinsVal);
      slots.push({
        timeStr,
        label,
        endTimeStr: minutesToTime(endMinsVal),
        endLabel,
        durationMinutes,
      });
    }
    return slots;
  }, [durationMinutes]);

  // Status & submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    bookingId: string;
    authorizationUrl?: string;
    invoiceUrl: string;
    emailSent: boolean;
    emailError?: string;
    booking: any;
  } | null>(null);

  const [copiedPaystack, setCopiedPaystack] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  // Manual total price input
  const handleTotalPriceChange = (val: number | '') => {
    if (val === '') {
      setTotalPriceOverride(0);
      setBasePackagePrice(0);
    } else {
      setTotalPriceOverride(val);
      setBasePackagePrice(Math.max(0, val - allAddonsTotal));
    }
    if (!isCustomDepositInput && typeof val === 'number') {
      const computedBase = Math.max(0, val - allAddonsTotal);
      setCustomDepositAmount(Math.round(computedBase / 2) + allAddonsTotal);
    }
  };

  // Add custom line item
  const handleAddCustomAddon = () => {
    if (!newAddonName.trim()) return;
    const priceNum = parseFloat(newAddonPrice) || 0;
    const newItem: CustomAddonItem = {
      id: `custom_${Date.now()}`,
      name: newAddonName.trim(),
      price: priceNum,
    };
    setCustomAddons((prev) => [...prev, newItem]);
    setNewAddonName('');
    setNewAddonPrice('');
    setTotalPriceOverride(null);
  };

  const handleRemoveCustomAddon = (id: string, price: number) => {
    setCustomAddons((prev) => prev.filter((item) => item.id !== id));
    setTotalPriceOverride(null);
  };

  // Toggle standard add-on
  const toggleStandardAddon = (addonKey: string) => {
    const isSelected = selectedStandardAddons.includes(addonKey);
    let nextAddons: string[];

    if (isSelected) {
      nextAddons = selectedStandardAddons.filter((k) => k !== addonKey);
    } else {
      nextAddons = [...selectedStandardAddons, addonKey];
    }
    setSelectedStandardAddons(nextAddons);
    setTotalPriceOverride(null);
  };

  // Compile all add-on names for payload
  const compiledAddons = [
    ...selectedStandardAddons.map((k) => ADDON_NAME_MAP[k] || k),
    ...customAddons.map((c) => `${c.name} (GHS ${c.price})`),
  ];

  // Financial calculations
  const calculatedDepositDefault = Math.round(basePackagePrice / 2) + allAddonsTotal;

  const depositNum =
    paymentOption === 'full'
      ? totalNum
      : paymentOption === 'paid_offline'
      ? totalNum
      : typeof customDepositAmount === 'number' && isCustomDepositInput
      ? customDepositAmount
      : calculatedDepositDefault;

  const remainingBalanceNum = Math.max(0, totalNum - depositNum);

  // Submit Order Creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter the client full name');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid client email address');
      return;
    }
    if (!date) {
      setErrorMessage('Please select the shoot date');
      return;
    }
    if (!totalPrice || totalNum <= 0) {
      setErrorMessage('Please specify a valid total price');
      return;
    }

    try {
      setSubmitting(true);

      const effectiveTime = fullDay ? 'Full Day' : isCustomTime ? customTimeInput : timeSlot;

      const payload = {
        name,
        email,
        phone,
        category,
        tier: selectedTier,
        packageTitle: packageTitle.trim() || 'Custom Photography Session',
        date,
        timeSlot: effectiveTime,
        fullDay,
        addOns: compiledAddons,
        notes,
        totalPrice: totalNum,
        paymentOption,
        depositAmount: depositNum,
        sendEmail,
      };

      const res = await fetch('/api/orders/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create custom order');
      }

      setCreatedResult({
        bookingId: data.bookingId,
        authorizationUrl: data.authorizationUrl,
        invoiceUrl: data.invoiceUrl,
        emailSent: data.emailSent,
        emailError: data.emailError,
        booking: data.booking,
      });

      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMessage(err.message || 'An error occurred while creating the custom order');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form to create another order
  const handleResetForm = () => {
    setCreatedResult(null);
    setName('');
    setEmail('');
    setPhone('');
    setCategory('portraits');
    setSelectedTier('Signature');
    setPackageTitle('Studio Portraits — Signature');
    setBasePackagePrice(1000);
    setTotalPriceOverride(null);
    setNotes('Professional studio setup\n• Guided posing & creative direction\n• 10 edited · 5 retouched images\n• Private online gallery');
    setSelectedStandardAddons([]);
    setCustomAddons([]);
    setCustomDepositAmount(500);
    setIsCustomDepositInput(false);
    setPaymentOption('deposit');
  };

  // WhatsApp share generator
  const handleShareWhatsApp = () => {
    if (!createdResult) return;
    const phoneClean = phone.replace(/[^0-9]/g, '');
    const payUrl = createdResult.authorizationUrl || createdResult.invoiceUrl;
    
    let text = `Hi ${name},\n\nYour custom photography session for *${date}* (*${packageTitle}*) has been prepared by BYNK Photography.\n\n`;
    text += `• Total Session Fee: GHS ${totalNum.toLocaleString()}\n`;
    if (paymentOption === 'deposit') {
      text += `• Deposit Due Now: GHS ${depositNum.toLocaleString()}\n`;
      text += `• Remaining Balance: GHS ${remainingBalanceNum.toLocaleString()}\n`;
    } else if (paymentOption === 'full') {
      text += `• Full Payment: GHS ${totalNum.toLocaleString()}\n`;
    } else {
      text += `• Status: Confirmed (Paid Offline)\n`;
    }

    if (createdResult.authorizationUrl) {
      text += `\n💳 Click here to secure your date via Paystack:\n${createdResult.authorizationUrl}\n`;
    } else {
      text += `\n📄 View your booking invoice here:\n${createdResult.invoiceUrl}\n`;
    }

    text += `\nThank you,\nBYNK Photography`;

    const waUrl = phoneClean
      ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const copyToClipboard = (text: string, type: 'paystack' | 'invoice') => {
    navigator.clipboard.writeText(text);
    if (type === 'paystack') {
      setCopiedPaystack(true);
      setTimeout(() => setCopiedPaystack(false), 2500);
    } else {
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto pr-1 pb-8 selection:bg-foreground/20">
      <AnimatePresence mode="wait">
        {createdResult ? (
          /* Success Screen with Instant Copy & Action Links */
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-3xl mx-auto w-full space-y-6 pt-2"
          >
            <div className="border border-emerald-500/30 bg-emerald-500/[0.04] p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-none">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-semibold block mb-1">
                    Custom Order Generated Successfully
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif text-foreground">
                    {packageTitle}
                  </h2>
                  <p className="text-foreground/50 text-xs mt-1">
                    Client: <strong className="text-foreground">{name}</strong> ({email}) · Date:{' '}
                    <strong className="text-foreground">{date}</strong>
                  </p>
                </div>
              </div>

              {/* Order Financial Breakdown */}
              <div className="grid grid-cols-3 gap-3 border-y border-foreground/10 py-4 text-center">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    Total Agreed
                  </span>
                  <span className="text-base sm:text-lg font-serif text-foreground font-semibold">
                    GHS {totalNum.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    {paymentOption === 'deposit' ? 'Deposit Charged' : 'Amount Charged'}
                  </span>
                  <span className="text-base sm:text-lg font-serif text-emerald-400 font-semibold">
                    GHS {depositNum.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    Remaining Balance
                  </span>
                  <span className="text-base sm:text-lg font-serif text-foreground/70">
                    GHS {remainingBalanceNum.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Email Delivery Status */}
              {sendEmail && (
                <div className="flex items-center gap-2 text-[11px] text-foreground/60 bg-foreground/[0.02] border border-foreground/10 px-3 py-2">
                  <Mail className="w-3.5 h-3.5 text-foreground/40" />
                  {createdResult.emailSent ? (
                    <span>Custom invoice &amp; payment link dispatched to <strong>{email}</strong></span>
                  ) : createdResult.emailError ? (
                    <span className="text-amber-400">Email notice: {createdResult.emailError}</span>
                  ) : (
                    <span>Email queued for delivery to {email}</span>
                  )}
                </div>
              )}

              {/* Action Links & 1-Click Copy */}
              <div className="space-y-3 pt-2">
                {createdResult.authorizationUrl && (
                  <div className="border border-foreground/20 bg-background p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/70 font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        Paystack Direct Payment Link (Ready to Share)
                      </span>
                      <span className="text-[10px] text-emerald-400 uppercase font-mono">Live Checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdResult.authorizationUrl}
                        className="flex-1 bg-foreground/[0.04] border border-foreground/15 px-3 py-2 text-[11px] font-mono text-foreground/80 truncate focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(createdResult.authorizationUrl!, 'paystack')}
                        className="flex items-center gap-1.5 bg-foreground text-background px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold hover:opacity-90 transition-opacity cursor-pointer flex-none"
                      >
                        {copiedPaystack ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPaystack ? 'Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Booking Invoice Link */}
                <div className="border border-foreground/15 bg-background p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Client Booking &amp; Invoice Link
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdResult.invoiceUrl}
                      className="flex-1 bg-foreground/[0.04] border border-foreground/15 px-3 py-2 text-[11px] font-mono text-foreground/60 truncate focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(createdResult.invoiceUrl, 'invoice')}
                      className="flex items-center gap-1.5 border border-foreground/20 px-3 py-2 text-[11px] uppercase tracking-[0.15em] hover:bg-foreground/[0.05] transition-colors cursor-pointer flex-none"
                    >
                      {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedInvoice ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Quick Share Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 text-xs uppercase tracking-[0.2em] font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send via WhatsApp
                </button>

                {createdResult.authorizationUrl && (
                  <a
                    href={createdResult.authorizationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 border border-foreground/30 hover:border-foreground py-3 px-5 text-xs uppercase tracking-[0.15em] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Checkout
                  </a>
                )}
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between border-t border-foreground/10 pt-4">
                <button
                  onClick={handleResetForm}
                  className="flex items-center gap-2 text-foreground/50 hover:text-foreground text-xs uppercase tracking-[0.15em] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Create Another Custom Order
                </button>

                {onViewShoots && (
                  <button
                    onClick={onViewShoots}
                    className="text-foreground hover:underline text-xs uppercase tracking-[0.15em] cursor-pointer"
                  >
                    View in Shoots List →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Custom Order Form */
          <motion.form
            key="order-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto w-full space-y-8"
          >
            {/* Header Description */}
            <div className="border-b border-foreground/10 pb-4">
              <div className="flex items-center gap-2 text-foreground/40 text-[9px] uppercase tracking-[0.25em] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
                Backend Bespoke Order Creator
              </div>
              <h2 className="text-2xl font-serif tracking-tight text-foreground">
                Create Custom Client Order
              </h2>
              <p className="text-foreground/50 text-xs mt-1">
                Generate tailored client bookings, set custom rates &amp; deposits, and generate instant Paystack payment links for WhatsApp or email delivery.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3 text-xs">
                <AlertCircle className="w-4 h-4 flex-none" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Client Information */}
            <div className="space-y-4 border border-foreground/10 bg-foreground/[0.01] p-5 sm:p-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-semibold flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                1. Client Contact Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nana Kwame"
                    className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Client Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Session & Shoot Specifications */}
            <div className="space-y-5 border border-foreground/10 bg-foreground/[0.01] p-5 sm:p-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-semibold flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                2. Shoot Package &amp; Schedule
              </span>

              {/* Category & Package Tier Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5 font-medium">
                    Category
                  </label>
                  <Select
                    value={category}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="w-full h-10 text-xs font-mono rounded-none border-foreground/20 bg-background focus:border-foreground">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="border-foreground/20 bg-background rounded-none z-[350]">
                      {RATE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs font-mono rounded-none">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5 font-medium">
                    Package Tier
                  </label>
                  <Select
                    value={selectedTier}
                    onValueChange={handleTierChange}
                  >
                    <SelectTrigger className="w-full h-10 text-xs font-mono rounded-none border-foreground/20 bg-background focus:border-foreground">
                      <SelectValue placeholder="Select package tier" />
                    </SelectTrigger>
                    <SelectContent className="border-foreground/20 bg-background rounded-none z-[350]">
                      {(RATE_CATEGORIES.find((c) => c.id === category)?.tiers || []).map((t) => (
                        <SelectItem key={t.name} value={t.name} className="text-xs font-mono rounded-none">
                          {t.name} (GHS {t.priceNum.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Package Title & Presets */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                  Shoot Package / Custom Project Title
                </label>
                <input
                  type="text"
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  placeholder="e.g. Studio Portraits — Signature"
                  className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground"
                />

                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PACKAGE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setPackageTitle(preset)}
                      className="text-[9px] font-mono border border-foreground/10 hover:border-foreground/30 px-2 py-0.5 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Shoot Date (Unrestricted Override) *
                  </label>
                  <ChronoSelect
                    value={date ? new Date(date + 'T00:00:00') : undefined}
                    onChange={(d) => {
                      if (d) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        setDate(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                    disableAdvanceNotice={true}
                    allowSundays={true}
                    className="w-full h-10 border-foreground/20 bg-background text-xs"
                    placeholder="Select Shoot Date"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/70 font-medium">
                      Preferred Start Time (From 9:00 AM)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-foreground/40">
                        {durationMinutes} mins
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomTime(!isCustomTime)}
                        className="text-[9px] uppercase tracking-[0.1em] text-foreground/60 hover:text-foreground underline cursor-pointer"
                      >
                        {isCustomTime ? 'Use Slot Grid' : 'Custom Time Range'}
                      </button>
                    </div>
                  </div>

                  {fullDay ? (
                    <div className="bg-foreground/[0.04] border border-foreground/15 px-3 py-3 text-center">
                      <p className="text-[11px] font-mono text-foreground font-medium tracking-wide">
                        Full Day Exclusive Session
                      </p>
                      <p className="text-[9px] font-mono text-foreground/50 mt-1">
                        9:00 AM – End of Event / Production
                      </p>
                      <p className="text-[8px] font-mono text-foreground/40 mt-0.5">
                        (Blocks entire day — no other bookings scheduled)
                      </p>
                    </div>
                  ) : isCustomTime ? (
                    <input
                      type="text"
                      value={customTimeInput}
                      onChange={(e) => setCustomTimeInput(e.target.value)}
                      placeholder="e.g. 14:00 – 17:30"
                      className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs font-mono focus:outline-none focus:border-foreground"
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 border border-foreground/10 bg-foreground/[0.01]">
                      {standardSlots.map((slot) => {
                        const isSelected = timeSlot === slot.timeStr;
                        return (
                          <button
                            key={slot.timeStr}
                            type="button"
                            onClick={() => setTimeSlot(slot.timeStr)}
                            className={`
                              py-2 px-2.5 text-center border transition-all duration-200 rounded-none cursor-pointer
                              ${
                                isSelected
                                  ? 'bg-foreground text-background border-foreground shadow-sm font-semibold'
                                  : 'bg-foreground/[0.03] text-foreground/80 border-foreground/20 hover:bg-foreground/[0.06] hover:border-foreground/40'
                              }
                            `}
                          >
                            <span className="block text-[11px] font-mono tracking-wide">{slot.label}</span>
                            <span
                              className={`block text-[8px] font-mono mt-0.5 ${
                                isSelected ? 'text-background/80' : 'text-foreground/40'
                              }`}
                            >
                              Ends {slot.endLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fullDay}
                      onChange={(e) => setFullDay(e.target.checked)}
                      className="rounded border-foreground/30 accent-foreground"
                    />
                    <span className="text-[10px] text-foreground/60 uppercase tracking-[0.1em]">
                      Entire Day Shoot (Wedding / All-Day Production)
                    </span>
                  </label>
                </div>
              </div>

              {/* Deliverables & Session Notes */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                  Deliverables, Session Requirements &amp; Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 20 high-res retouched images, 3 outfit changes, studio lighting setup included, raw previews delivered in 48 hours."
                  className="w-full bg-background border border-foreground/20 p-3 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground leading-relaxed"
                />
              </div>
            </div>

            {/* Section 3: Add-ons & Extra Services */}
            <div className="space-y-4 border border-foreground/10 bg-foreground/[0.01] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-semibold flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  3. Add-ons &amp; Custom Line Items
                </span>
                <span className="text-[10px] text-foreground/40 font-mono">
                  {compiledAddons.length} included
                </span>
              </div>

              {/* Standard Add-on Chips */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(ADDON_NAME_MAP).slice(0, 8).map(([key, label]) => {
                  const isSelected = selectedStandardAddons.includes(key);
                  const price = ADDON_PRICES[key] || 0;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleStandardAddon(key)}
                      className={`text-[10px] uppercase tracking-[0.1em] px-2.5 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-foreground/10 border-foreground text-foreground font-semibold'
                          : 'bg-background border-foreground/15 text-foreground/50 hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="opacity-60 font-mono">+GHS {price}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Line Item Builder */}
              <div className="pt-2 border-t border-foreground/10 space-y-2">
                <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block">
                  Add Bespoke Line Item / Service
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    placeholder="e.g. Drone Operator / Hair Stylist"
                    className="flex-1 bg-background border border-foreground/20 px-3 py-1.5 text-xs placeholder:text-foreground/25 focus:outline-none focus:border-foreground"
                  />
                  <input
                    type="number"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                    placeholder="GHS"
                    className="w-24 bg-background border border-foreground/20 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAddon}
                    className="flex items-center gap-1 border border-foreground/30 hover:border-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                {/* List of Custom Line Items */}
                {customAddons.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {customAddons.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-foreground/[0.02] border border-foreground/10 px-3 py-1.5 text-xs font-mono"
                      >
                        <span>{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400">+GHS {item.price.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomAddon(item.id, item.price)}
                            className="text-foreground/30 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Pricing & Deposit Configuration */}
            <div className="space-y-5 border border-foreground/10 bg-foreground/[0.01] p-5 sm:p-6">
              <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-semibold flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                4. Pricing &amp; Payment Terms
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Total Agreed Amount */}
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Total Agreed Session Fee (GHS) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 font-mono text-xs">
                      GHS
                    </span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={totalPrice}
                      onChange={(e) => handleTotalPriceChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-background border border-foreground/20 pl-12 pr-3 py-2 text-base font-serif font-semibold focus:outline-none focus:border-foreground font-mono"
                    />
                  </div>
                </div>

                {/* Payment Option Selection */}
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.15em] text-foreground/40 mb-1.5">
                    Payment Requirement Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('deposit')}
                      className={`p-2 text-center border text-[10px] uppercase tracking-[0.1em] transition-all cursor-pointer ${
                        paymentOption === 'deposit'
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'bg-background text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      50% / Custom Deposit
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('full')}
                      className={`p-2 text-center border text-[10px] uppercase tracking-[0.1em] transition-all cursor-pointer ${
                        paymentOption === 'full'
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'bg-background text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      100% Upfront
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('paid_offline')}
                      className={`p-2 text-center border text-[10px] uppercase tracking-[0.1em] transition-all cursor-pointer ${
                        paymentOption === 'paid_offline'
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'bg-background text-foreground/60 border-foreground/20 hover:border-foreground/40'
                      }`}
                    >
                      Paid Offline (Cash/MoMo)
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Deposit Adjuster (if in deposit mode) */}
              {paymentOption === 'deposit' && (
                <div className="bg-background border border-foreground/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-foreground/70">
                      Deposit Amount (Paystack will charge this now)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDepositInput(!isCustomDepositInput);
                        if (isCustomDepositInput && typeof totalPrice === 'number') {
                          setCustomDepositAmount(Math.round(totalPrice / 2));
                        }
                      }}
                      className="text-[9px] uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground underline cursor-pointer"
                    >
                      {isCustomDepositInput ? 'Reset to 50%' : 'Custom Amount'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 font-mono text-xs">
                        GHS
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={totalNum || undefined}
                        value={customDepositAmount}
                        onChange={(e) => {
                          setIsCustomDepositInput(true);
                          setCustomDepositAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                        }}
                        className="w-full bg-foreground/[0.02] border border-foreground/20 pl-12 pr-3 py-1.5 text-sm font-mono focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <span className="text-xs text-foreground/50 font-mono">
                      = {totalNum > 0 ? Math.round((depositNum / totalNum) * 100) : 0}% of Total
                    </span>
                  </div>
                </div>
              )}

              {/* Live Financial Summary Banner */}
              <div className="border border-foreground/20 bg-foreground/[0.03] p-4 flex items-center justify-around text-center">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    Total Session
                  </span>
                  <span className="text-base sm:text-lg font-serif text-foreground font-semibold">
                    GHS {totalNum.toLocaleString()}
                  </span>
                </div>
                <div className="text-foreground/20">|</div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    {paymentOption === 'deposit' ? 'Charged on Checkout' : paymentOption === 'full' ? 'Charged on Checkout' : 'Marked Paid'}
                  </span>
                  <span className="text-base sm:text-lg font-serif text-emerald-400 font-semibold">
                    GHS {depositNum.toLocaleString()}
                  </span>
                </div>
                <div className="text-foreground/20">|</div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/40 block mb-1">
                    Remaining Balance Due
                  </span>
                  <span className="text-base sm:text-lg font-serif text-foreground/70">
                    GHS {remainingBalanceNum.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Email Toggle & Submission */}
            <div className="space-y-4 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none bg-foreground/[0.02] border border-foreground/10 p-3.5">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-foreground/30 accent-foreground"
                />
                <div>
                  <span className="text-xs text-foreground font-semibold block">
                    Automatically dispatch Custom Booking Invoice to client email ({email || 'client@...'})
                  </span>
                  <span className="text-[10px] text-foreground/50">
                    Sends branded email with breakdown of session details and direct Paystack payment button.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-foreground text-background py-4 px-6 text-xs uppercase tracking-[0.25em] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>Generating Custom Order &amp; Paystack Link...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Create Custom Order &amp; Generate Paystack Link</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
