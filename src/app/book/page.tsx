'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, Heart, Sparkles, Building, MapPin, X, CheckCircle2 } from 'lucide-react';
import { TagsSelector, type Tag } from '@/components/ui/tags-selector';
import { ChronoSelect } from '@/components/ui/chrono-select';
import {
  type AvailabilityMap,
  SLOT_LABELS,
  isFullDayCategory,
  toDateKey,
} from '@/lib/booking-types';

/* ────────────────────────────────────────
   Rate Card Data — from NK_Photography_2026_Rate_Card.docx
   ──────────────────────────────────────── */

type Tier = {
  name: string;
  price: string;
  duration: string;
  features: string[];
  note?: string;
  bestValue?: boolean;
};

type Category = {
  id: string;
  label: string;
  number: string;
  icon: React.ReactNode;
  tiers: Tier[];
};

const categories: Category[] = [
  {
    id: 'portraits',
    label: 'Studio Portraits',
    number: '01',
    icon: <Camera className="w-3 h-3" />,
    tiers: [
      {
        name: 'Signature',
        price: 'GHS 1,000',
        duration: 'Up to 1 hour · 1 outfit',
        features: [
          'Individual portrait session',
          'Professional studio setup',
          'Guided posing & creative direction',
          '10 edited · 5 retouched images',
          'Private online gallery',
          'High-resolution digital delivery',
        ],
        note: 'Headshots, birthdays, professional profiles',
      },
      {
        name: 'Lux',
        price: 'GHS 1,500',
        duration: 'Up to 1.5 hours · 2 outfits',
        features: [
          'Individual, couple or small-group session',
          'Creative lighting variations',
          'Guided posing & direction',
          '20 edited · 10 retouched images',
          'Private online gallery',
          '5 preview images within 48 hours',
        ],
        note: 'Birthdays, couples, fashion, personal branding',
      },
      {
        name: 'Platinum',
        price: 'GHS 2,200',
        duration: 'Up to 2.5 hours · 3 outfits',
        features: [
          'Individual, couple or family session',
          'Multiple lighting setups & background variation',
          'Creative direction & guided posing',
          '30 edited · 15 retouched images',
          'Private online gallery',
          '5 priority images within 48 hours',
        ],
        note: 'Editorial, premium birthdays, fashion campaigns',
      },
    ],
  },
  {
    id: 'location-portraits',
    label: 'Location Portraits',
    number: '02',
    icon: <MapPin className="w-3 h-3" />,
    tiers: [
      {
        name: 'Signature',
        price: 'GHS 1,000',
        duration: 'Up to 1 hour · 1 location · 1 outfit',
        features: [
          'Individual portrait session',
          'Professional portable lighting setup',
          'Guided posing & creative direction',
          '10 edited · 5 retouched images',
          'Private online gallery',
          'High-resolution digital delivery',
        ],
        note: 'Simple portraits, outdoor birthdays, personal content',
      },
      {
        name: 'Lux',
        price: 'GHS 1,500',
        duration: 'Up to 1.5 hours · 1–2 locations · 2 outfits',
        bestValue: true,
        features: [
          '1–2 locations within close proximity',
          'Professional portable lighting setup',
          'Guided posing & creative direction',
          '20 edited · 10 retouched images',
          'Private online gallery',
          '5 preview images within 48 hours',
        ],
        note: 'Personal branding, fashion portraits, outdoor sessions',
      },
      {
        name: 'Platinum',
        price: 'GHS 2,200',
        duration: 'Up to 2.5 hours · Up to 2 locations · 3 outfits',
        features: [
          'Up to 2 locations & multiple lighting setups',
          'Full creative direction & guided posing',
          '30 edited · 15 retouched images',
          'Private online gallery',
          '5 priority images within 48 hours',
          'High-resolution digital delivery',
        ],
        note: 'Editorial portraits, fashion sessions, creative campaigns',
      },
    ],
  },
  {
    id: 'weddings',
    label: 'Weddings',
    number: '03',
    icon: <Heart className="w-3 h-3" />,
    tiers: [
      {
        name: 'Signature',
        price: 'GHS 3,800',
        duration: 'Up to 6 hours · 1 photographer',
        features: [
          'Getting-ready & ceremony coverage',
          'Couple & family portraits',
          'Reception & candid coverage',
          '250+ edited · 20 retouched images',
          'Private online gallery',
          'High-resolution digital delivery',
        ],
        note: 'Intimate weddings & single-program celebrations',
      },
      {
        name: 'Lux',
        price: 'GHS 5,500',
        duration: 'Up to 8 hours · 1 lead photographer',
        bestValue: true,
        features: [
          'Full ceremony & reception coverage',
          'Getting-ready & bridal party portraits',
          'Details & decor photography',
          '350+ edited · 35 retouched images',
          'Private online gallery',
          'Sneak-peek collection within 72 hours',
        ],
        note: 'Comprehensive wedding-day coverage',
      },
      {
        name: 'Platinum',
        price: 'GHS 7,500',
        duration: 'Up to 10 hours · 2 photographers',
        features: [
          'Full traditional or white wedding coverage',
          'Couple, bridal party & family portraits',
          'Candid & documentary coverage',
          '500+ edited · 50 retouched images',
          '20-page premium album + framed print',
          'Sneak-peek collection within 72 hours',
        ],
        note: 'Comprehensive coverage & premium collection',
      },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    number: '04',
    icon: <Sparkles className="w-3 h-3" />,
    tiers: [
      {
        name: 'Signature',
        price: 'GHS 1,600',
        duration: 'Up to 4 hours · 1 photographer',
        features: [
          'Event & key moments coverage',
          'Candid & guest photography',
          'Group photographs',
          '200+ edited · 15 retouched images',
          'Venue & decor details',
          'Digital delivery',
        ],
        note: 'Birthdays, naming ceremonies, church programs',
      },
      {
        name: 'Lux',
        price: 'GHS 2,600',
        duration: 'Up to 6 hours · 1 photographer',
        bestValue: true,
        features: [
          'Full event & stage/program coverage',
          'VIP & candid photography',
          'Group photographs & venue details',
          '300+ edited · 25 retouched images',
          'Private online gallery',
          'Sneak-peek collection within 48 hours',
        ],
        note: 'Corporate events, launches, celebrations',
      },
      {
        name: 'Platinum',
        price: 'GHS 3,800',
        duration: 'Up to 8 hours · 2 photographers',
        features: [
          'Full event & behind-the-scenes coverage',
          'Speaker, performer & VIP photography',
          'Same-day preview collection',
          '450+ edited · 40 retouched images',
          'Private online gallery',
          'Priority image delivery',
        ],
        note: 'Conferences, concerts, high-profile events',
      },
    ],
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    number: '05',
    icon: <Building className="w-3 h-3" />,
    tiers: [
      {
        name: 'Signature',
        price: 'GHS 900',
        duration: '1 property · Up to 1.5 hours',
        features: [
          'Interior & exterior photography',
          'Room-by-room coverage',
          'Colour & exposure correction',
          '20 edited images',
          'Basic perspective correction',
          'High-resolution digital delivery',
        ],
        note: 'Apartments, rental properties, smaller homes',
      },
      {
        name: 'Lux',
        price: 'GHS 1,500',
        duration: '1 property · Up to 2.5 hours',
        features: [
          'Full interior & exterior coverage',
          'Architectural details & amenities',
          'Professional colour grading',
          '35 edited images',
          'Advanced perspective correction',
          'Private online gallery',
        ],
        note: 'Homes, Airbnb properties, property agents',
      },
      {
        name: 'Platinum',
        price: 'GHS 2,400',
        duration: '1 property · Up to 4 hours',
        features: [
          'Full coverage & twilight photography',
          'Amenities & surrounding environment',
          'Premium hero images',
          '50+ edited images',
          'Advanced colour grading & correction',
          '5 priority marketing images',
        ],
        note: 'Luxury homes, premium Airbnb, agencies',
      },
    ],
  },
];

/* ────────────────────────────────────────
   Terms & Conditions — from Rate Card
   ──────────────────────────────────────── */

const termsAndConditions = [
  {
    number: '01',
    title: 'Booking & Deposit',
    content:
      'A 50% non-refundable deposit of the base package price is required to secure your date. Optional add-ons are billed separately and paid 100% upfront at the time of booking — they do not count toward the 50% package deposit. A date is confirmed once payment has been received. The remaining 50% balance of the base package must be settled before photography coverage begins.',
  },
  {
    number: '02',
    title: 'Rescheduling',
    content:
      'Clients may request to reschedule their booking subject to reasonable notice and availability. The booking fee may be transferred to one alternative date where reasonable notice is provided. If the requested alternative date is unavailable, the booking may be treated as cancelled.',
  },
  {
    number: '03',
    title: 'Cancellation Policy',
    content:
      'The official cancellation window is at least 2 days (48 hours) prior to the scheduled shoot date. Base package booking fees (50% deposit) reserve the photographer\'s time and date and are non-refundable upon cancellation.',
  },
  {
    number: '04',
    title: 'Add-Ons Policy & Refunds',
    content:
      'Add-ons are separate from the core package cost and do not count toward the 50% base package deposit. Payments for add-ons are 100% refundable if cancellation or add-on removal is requested at least 2 days (48 hours) before the shoot date. Cancellations made less than 2 days before the shoot date do not qualify for add-on refunds.',
  },
  {
    number: '05',
    title: 'Client Delays',
    content:
      'Photography coverage begins at the agreed start time. Client delays do not automatically extend the booked coverage period. Where additional time is available, overtime may be charged at the applicable hourly rate.',
  },
  {
    number: '06',
    title: 'Overtime',
    content:
      'Coverage beyond the selected package duration is subject to photographer availability. Additional hours are charged at the applicable overtime rate.',
  },
  {
    number: '07',
    title: 'Image Delivery',
    content:
      'Estimated delivery timelines: Studio 5–10 working days; Real Estate 5–7 working days; Events 7–14 working days; Weddings 14–30 working days. Delivery times may vary depending on workload, assignment size and complexity. Rush delivery is available at an additional charge.',
  },
  {
    number: '08',
    title: 'Image Selection & Retouching',
    content:
      'The number of professionally retouched photographs included in each package is clearly stated. Additional retouching may be purchased separately. Complex manipulation, extensive object removal or advanced Photoshop work may attract an additional charge.',
  },
  {
    number: '09',
    title: 'RAW Files',
    content:
      'RAW/unprocessed camera files are not included in any package. Clients receive the professionally processed final images specified in their selected package.',
  },
  {
    number: '10',
    title: 'Delivery & Backup',
    content:
      'Final photographs will be delivered through a private online gallery or agreed digital delivery method. Clients are responsible for downloading and securely backing up their photographs after delivery.',
  },
  {
    number: '11',
    title: 'Copyright',
    content:
      'BYNK retains copyright ownership of all photographs created during an assignment unless otherwise agreed in writing. Clients receive a personal-use licence for delivered photographs. Commercial advertising, resale, publication or third-party licensing may require an additional commercial usage agreement.',
  },
  {
    number: '12',
    title: 'Portfolio Use',
    content:
      'BYNK may use selected photographs for portfolio, website, social media, advertising and promotional purposes. Clients requiring complete privacy must communicate this before the photography session or event.',
  },
  {
    number: '13',
    title: 'Weddings',
    content:
      'Clients are encouraged to provide a final wedding timeline before the event. Major changes to the agreed schedule or additional ceremonies may require additional coverage fees.',
  },
  {
    number: '14',
    title: 'Outdoor Sessions & Weather',
    content:
      'For outdoor sessions, weather conditions may require the session to be rescheduled or moved to an alternative location. Rescheduling remains subject to availability.',
  },
  {
    number: '15',
    title: 'Venue & Third-Party Costs',
    content:
      'Unless explicitly stated in the selected package, the client is responsible for venue fees, location permits, entrance fees, parking fees and other third-party charges.',
  },
  {
    number: '16',
    title: 'Equipment & Unforeseen Circumstances',
    content:
      'BYNK takes reasonable measures to maintain professional equipment and backup arrangements. In the unlikely event of equipment failure, illness, accident or another circumstance beyond reasonable control, every reasonable effort will be made to complete the assignment or provide an appropriate alternative.',
  },
  {
    number: '17',
    title: 'Commercial Usage',
    content:
      'Photography intended for commercial campaigns, advertising, billboards, publications or third-party commercial use may require a separate licensing agreement. Real estate packages include normal usage for the marketing and listing of the photographed property.',
  },
];

/* ────────────────────────────────────────
   Lightbox Components
   ──────────────────────────────────────── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

/* ── Terms & Conditions Lightbox ── */
function TermsLightbox({ onClose }: { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[80vh] bg-background border border-foreground/[0.08] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/[0.06] shrink-0">
          <div>
            <p className="text-foreground/40 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              BYNK Photography
            </p>
            <h2 className="text-lg font-serif tracking-tight text-foreground">
              Terms &amp; Conditions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/30 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {termsAndConditions.map((term) => (
            <div key={term.number}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-foreground/15 font-mono text-[9px] tracking-[0.2em]">
                  {term.number}
                </span>
                <h3 className="text-xs font-serif tracking-tight text-foreground">
                  {term.title}
                </h3>
              </div>
              <p className="text-foreground/40 text-[10px] font-mono leading-relaxed tracking-wide pl-6">
                {term.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-foreground/[0.06] shrink-0">
          <p className="text-foreground/20 text-[9px] font-mono uppercase tracking-[0.2em] text-center">
            Prices are subject to periodic review based on service offerings and operating costs.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Add-Ons Data ── */
type AddOn = {
  id: string;
  name: string;
  price: number;
  priceLabel?: string;
};

const categoryAddOns: Record<string, AddOn[]> = {
  portraits: [
    { id: 'outfit', name: 'Additional Outfit', price: 150 },
    { id: 'retouched', name: 'Additional Retouched Image', price: 50 },
    { id: 'edited', name: 'Additional Edited Image', price: 30 },
    { id: 'studio-hour', name: 'Additional Studio Hour', price: 350 },
    { id: 'person', name: 'Additional Person', price: 100, priceLabel: 'From GHS 100' },
    { id: 'concept', name: 'Concept & Creative Direction', price: 300, priceLabel: 'From GHS 300' },
    { id: 'makeup', name: 'Makeup Artist', price: 500, priceLabel: 'From GHS 500' },
  ],
  'location-portraits': [
    { id: 'outfit', name: 'Additional Outfit', price: 150 },
    { id: 'retouched', name: 'Additional Retouched Image', price: 50 },
    { id: 'edited', name: 'Additional Edited Image', price: 30 },
    { id: 'hour', name: 'Additional Coverage Hour', price: 300 },
    { id: 'location', name: 'Additional Location', price: 200, priceLabel: 'From GHS 200' },
    { id: 'concept', name: 'Concept & Creative Direction', price: 300, priceLabel: 'From GHS 300' },
    { id: 'makeup', name: 'Makeup Artist', price: 500, priceLabel: 'From GHS 500' },
  ],
  weddings: [
    { id: 'hour', name: 'Additional Coverage Hour', price: 350 },
    { id: 'photographer', name: 'Second Photographer', price: 700 },
    { id: 'prewedding', name: 'Pre-Wedding Session', price: 1000 },
    { id: 'engagement', name: 'Traditional / Engagement Ceremony Coverage', price: 1500, priceLabel: 'From GHS 1,500' },
    { id: 'shower', name: 'Bridal Shower / Bachelorette Coverage', price: 1200, priceLabel: 'From GHS 1,200' },
    { id: 'retouched', name: 'Additional Retouched Image', price: 50 },
    { id: 'album', name: 'Premium Wedding Album', price: 1500, priceLabel: 'From GHS 1,500' },
    { id: 'print', name: 'Framed Print', price: 500, priceLabel: 'From GHS 500' },
    { id: 'rush', name: 'Rush Wedding Delivery', price: 500, priceLabel: 'From GHS 500' },
  ],
  events: [
    { id: 'hour', name: 'Additional Coverage Hour', price: 350 },
    { id: 'photographer', name: 'Second Photographer', price: 700 },
    { id: 'same-day', name: 'Same-Day Preview Collection', price: 400 },
    { id: 'rush', name: 'Rush Delivery', price: 400, priceLabel: 'From GHS 400' },
    { id: 'retouched', name: 'Additional Retouched Image', price: 50 },
  ],
  realestate: [
    { id: 'property', name: 'Additional Property at Same Location', price: 600, priceLabel: 'From GHS 600' },
    { id: 'images', name: 'Additional 10 Edited Images', price: 200 },
    { id: 'twilight', name: 'Twilight Photography', price: 400 },
    { id: 'reel', name: 'Property Social Media Reel', price: 600, priceLabel: 'From GHS 600' },
    { id: 'drone-photo', name: 'Drone Photography', price: 800, priceLabel: 'From GHS 800' },
    { id: 'drone-video', name: 'Drone Video', price: 1000, priceLabel: 'From GHS 1,000' },
  ],
};

/* ── Booking Form Lightbox ── */
function BookingFormLightbox({
  categoryId,
  categoryLabel,
  tierName,
  tierPrice,
  onClose,
  onOpenTerms,
}: {
  categoryId: string;
  categoryLabel: string;
  tierName: string;
  tierPrice: string;
  onClose: () => void;
  onOpenTerms: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Availability state
  const [availabilityMap, setAvailabilityMap] = useState<AvailabilityMap>({});
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const fullDay = isFullDayCategory(categoryId);

  const availableAddOns = categoryAddOns[categoryId] || [];

  // Base price & deposit extraction: Add-ons paid 100% upfront, Base package 50% upfront
  const basePriceNum = parseInt(tierPrice.replace(/[^0-9]/g, ''), 10) || 0;
  const selectedAddOnsList = availableAddOns.filter((addon) =>
    selectedAddOnIds.includes(addon.id)
  );
  const addOnsTotal = selectedAddOnsList.reduce((sum, item) => sum + item.price, 0);
  const totalPriceNum = basePriceNum + addOnsTotal;
  const baseDepositGhs = Math.round(basePriceNum / 2);
  const depositGhs = baseDepositGhs + addOnsTotal;
  const remainingBalanceGhs = basePriceNum - baseDepositGhs;

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Fetch availability on mount
  const fetchAvailability = useCallback(async () => {
    try {
      setLoadingAvailability(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data: AvailabilityMap = await res.json();
        setAvailabilityMap(data);

        // Build disabled dates array (fully blocked dates)
        const blocked: Date[] = [];
        for (const [dateKey, day] of Object.entries(data)) {
          if (day.blocked) {
            const [y, m, d] = dateKey.split('-').map(Number);
            blocked.push(new Date(y, m - 1, d));
          }
        }
        setDisabledDates(blocked);
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Auto-set slot for full-day categories
  useEffect(() => {
    if (fullDay) {
      setSelectedSlot('full_day');
    }
  }, [fullDay]);

  // Clear slot when date changes (for non-full-day)
  useEffect(() => {
    if (!fullDay) {
      setSelectedSlot('');
    }
    setSubmitError('');
  }, [date, fullDay]);

  const isValid =
    name.trim() &&
    email.trim() &&
    phone.trim() &&
    date &&
    (selectedSlot || fullDay) &&
    agreedToTerms &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !date) return;

    setSubmitting(true);
    setSubmitError('');

    const dateKey = toDateKey(date);

    try {
      // 1. Create pending booking in Supabase
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateKey,
          slot: fullDay ? 'full_day' : selectedSlot,
          category: categoryId,
          tier: tierName,
          name,
          email,
          phone,
          addOns: selectedAddOnIds,
          totalPrice: totalPriceNum,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setSubmitError(result.error || 'Booking failed. Please try again.');
        await fetchAvailability();
        setSubmitting(false);
        return;
      }

      // 2. Initialize Paystack payment for 50% deposit
      const paystackRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: result.bookingId,
          email,
          totalPrice: totalPriceNum,
          category: categoryLabel,
          tier: tierName,
          name,
          phone,
        }),
      });

      const paystackResult = await paystackRes.json();

      if (!paystackRes.ok || !paystackResult.authorizationUrl) {
        setSubmitError(paystackResult.error || 'Payment initialization failed. Please try again.');
        setSubmitting(false);
        return;
      }

      // 3. Redirect client to Paystack checkout page
      window.location.href = paystackResult.authorizationUrl;
    } catch (err) {
      console.error('Booking submit error:', err);
      setSubmitError('Something went wrong initializing payment. Please try again.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const inputClasses =
    'w-full bg-foreground/[0.03] hover:bg-foreground/[0.05] focus:bg-background border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide placeholder:text-foreground/30 focus:outline-none transition-colors h-10 rounded-none';

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Panel */}
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[75vw] max-h-[85vh] bg-background border border-foreground/20 shadow-2xl shadow-black/50 flex flex-col rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 shrink-0">
          <div>
            <p className="text-foreground/50 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              {categoryLabel} · {tierName}
            </p>
            <h2 className="text-lg font-serif tracking-tight text-foreground">
              Book This Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form (Landscape 2-Column Grid on Desktop) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Package Details, Add-ons & Total Price */}
            <div className="space-y-4">
              {/* Package summary & Total Price */}
              <div className="bg-foreground/[0.04] border border-foreground/15 p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-foreground/70 text-[10px] font-mono uppercase tracking-[0.15em]">
                    Base Package ({tierName})
                  </span>
                  <span className="text-foreground font-serif text-sm font-medium">
                    {tierPrice}
                  </span>
                </div>

                {selectedAddOnsList.length > 0 && (
                  <div className="flex items-baseline justify-between pt-2 border-t border-foreground/10 text-[10px] font-mono">
                    <span className="text-foreground/60 uppercase tracking-wider">
                      Add-ons ({selectedAddOnsList.length})
                    </span>
                    <span className="text-foreground/80 font-medium">
                      + GHS {addOnsTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-2.5 border-t border-foreground/20">
                  <span className="text-foreground/70 text-[10px] font-mono uppercase tracking-[0.2em]">
                    Total Package Price
                  </span>
                  <span className="text-foreground font-serif text-sm font-medium">
                    GHS {totalPriceNum.toLocaleString()}
                  </span>
                </div>

                {/* 50% Deposit highlight */}
                <div className="bg-foreground/[0.04] border border-foreground/20 p-2.5 space-y-1 mt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-foreground text-[10px] font-mono uppercase tracking-[0.2em] font-semibold">
                      50% Deposit Due Now
                    </span>
                    <span className="text-foreground font-serif text-base font-bold">
                      GHS {depositGhs.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[9px] font-mono text-foreground/50 pt-1 border-t border-foreground/10">
                    <span>Balance on Shoot Date:</span>
                    <span>GHS {remainingBalanceGhs.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Add-ons selection section */}
              {availableAddOns.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] font-medium">
                    Optional Add-Ons
                  </label>
                  <TagsSelector
                    tags={availableAddOns.map((addon) => ({
                      id: addon.id,
                      label: `${addon.name} (${addon.priceLabel || `+ GHS ${addon.price.toLocaleString()}`})`,
                    }))}
                    selectedTags={selectedAddOnsList.map((addon) => ({
                      id: addon.id,
                      label: `${addon.name} (${addon.priceLabel || `+ GHS ${addon.price.toLocaleString()}`})`,
                    }))}
                    onSelectedTagsChange={(newSelected) =>
                      setSelectedAddOnIds(newSelected.map((t) => t.id))
                    }
                  />
                </div>
              )}
            </div>

            {/* Right Column: User Details, Terms & Submit */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1 font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputClasses}
                  required
                />
              </div>

              {/* Email & Phone side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1 font-medium">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1 font-medium">
                  Preferred Date
                </label>
                <ChronoSelect
                  value={date}
                  onChange={setDate}
                  yearRange={[2026, 2035]}
                  placeholder={loadingAvailability ? 'Loading availability...' : 'Pick a booking date'}
                  disabledDates={disabledDates}
                />
              </div>

              {/* Time Slot Picker — separate from date picker */}
              {date && !fullDay && (
                <div>
                  <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1 font-medium">
                    Preferred Time
                  </label>
                  <div className="flex gap-2">
                    {(['morning', 'afternoon'] as const).map((slot) => {
                      const dateKey = toDateKey(date);
                      const dayInfo = availabilityMap[dateKey];
                      const isBooked = dayInfo?.slots?.[slot] === 'booked';
                      const isSelected = selectedSlot === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(slot)}
                          className={`
                            flex-1 py-2.5 px-3 text-[10px] font-mono tracking-wide border transition-all duration-200 rounded-none
                            ${isBooked
                              ? 'bg-foreground/[0.03] text-foreground/20 border-foreground/[0.06] cursor-not-allowed line-through'
                              : isSelected
                                ? 'bg-foreground text-background border-foreground shadow-sm cursor-pointer'
                                : 'bg-foreground/[0.03] text-foreground/70 border-foreground/20 hover:bg-foreground/[0.06] hover:border-foreground/30 cursor-pointer'
                            }
                          `}
                        >
                          {SLOT_LABELS[slot]}
                          {isBooked && (
                            <span className="block text-[8px] mt-0.5 opacity-50" style={{ textDecoration: 'none' }}>
                              Unavailable
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full-day indicator for weddings/events */}
              {date && fullDay && (
                <div className="bg-foreground/[0.04] border border-foreground/15 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-mono text-foreground/70 tracking-wide">
                    Full Day Session
                  </p>
                  <p className="text-[9px] font-mono text-foreground/40 mt-0.5">
                    8 AM – End of event
                  </p>
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <p className="text-red-400 text-[10px] font-mono tracking-wide">
                    {submitError}
                  </p>
                </div>
              )}

              {/* T&C checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-foreground cursor-pointer shrink-0"
                />
                <label
                  htmlFor="agree-terms"
                  className="text-foreground/70 text-[10px] font-mono tracking-wide cursor-pointer leading-relaxed"
                >
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={onOpenTerms}
                    className="text-foreground font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Terms &amp; Conditions
                  </button>
                </label>
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={!isValid}
                  className={`
                    w-full py-3 font-mono text-[10px] uppercase tracking-[0.25em] 
                    border transition-all duration-300
                    ${
                      isValid
                        ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 cursor-pointer shadow-md'
                        : 'bg-transparent text-foreground/30 border-foreground/15 cursor-not-allowed'
                    }
                  `}
                >
                  {submitting
                    ? 'Connecting to Paystack...'
                    : `Pay 50% Deposit (GHS ${depositGhs.toLocaleString()})`}
                </button>

                <p className="text-foreground/40 text-[9px] font-mono uppercase tracking-[0.15em] text-center pt-2">
                  Secured by Paystack · Mobile Money, Cards &amp; Apple Pay
                </p>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Custom Enquiry Lightbox ── */
function EnquiryLightbox({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const isValid = name.trim() && message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const text = [
      `Hi, my name is ${name}.`,
      ``,
      message,
    ].join('\n');

    window.open(
      `https://wa.me/233205555084?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const inputClasses =
    'w-full bg-foreground/[0.03] hover:bg-foreground/[0.05] focus:bg-background border border-foreground/20 focus:border-foreground px-3 py-2 text-foreground text-[11px] font-mono tracking-wide placeholder:text-foreground/30 focus:outline-none transition-colors rounded-none';

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-background border border-foreground/20 shadow-2xl shadow-black/50 rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
          <div>
            <p className="text-foreground/50 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              Custom Packages
            </p>
            <h2 className="text-lg font-serif tracking-tight text-foreground">
              Send an Enquiry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5 font-medium">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={`${inputClasses} h-10`}
              required
            />
          </div>

          <div>
            <label className="block text-foreground/70 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5 font-medium">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you're looking for — type of shoot, location, number of people, any special requirements..."
              rows={5}
              className={`${inputClasses} resize-none leading-relaxed py-2.5`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`
              w-full py-3 mt-2 font-mono text-[10px] uppercase tracking-[0.25em] 
              border transition-all duration-300
              ${
                isValid
                  ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 cursor-pointer shadow-md'
                  : 'bg-transparent text-foreground/30 border-foreground/15 cursor-not-allowed'
              }
            `}
          >
            Send via WhatsApp
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────
   Main Page
   ──────────────────────────────────────── */

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function BookPage() {
  const [activeCategory, setActiveCategory] = useState('portraits');
  const active = categories.find((c) => c.id === activeCategory)!;

  const [showTerms, setShowTerms] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [bookingTier, setBookingTier] = useState<{
    categoryId: string;
    categoryLabel: string;
    tierName: string;
    tierPrice: string;
  } | null>(null);

  const openTerms = useCallback(() => setShowTerms(true), []);
  const closeTerms = useCallback(() => setShowTerms(false), []);

  return (
    <main className="h-screen bg-background relative flex flex-col overflow-hidden selection:bg-foreground/20">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-foreground/[0.02] via-transparent to-transparent" />

      {/* Content container */}
      <div className="relative z-10 flex flex-col h-full pt-20 sm:pt-24 pb-6 px-6 sm:px-10 lg:px-16">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 lg:mb-8 shrink-0"
        >
          <div>
            <p className="text-foreground/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">
              2026 Rate Card
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-tight text-foreground">
              Book a Session
            </h1>
          </div>

          {/* Category tabs */}
          <nav className="flex items-center gap-1 sm:gap-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  group relative font-mono text-[10px] uppercase tracking-[0.15em] 
                  transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                  px-3 py-2 flex items-center gap-1.5
                  ${
                    activeCategory === cat.id
                      ? 'text-foreground'
                      : 'text-foreground/30 hover:text-foreground/60'
                  }
                `}
              >
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="sm:hidden">{cat.number}</span>
                {activeCategory === cat.id && (
                  <motion.div
                    layoutId="active-category-underline"
                    className="absolute bottom-0 left-3 right-3 h-px bg-foreground"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Category number + label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-baseline gap-3 mb-4 lg:mb-6 shrink-0"
        >
          <span className="text-foreground/15 font-mono text-[10px] tracking-[0.2em]">
            {active.number}
          </span>
          <div className="w-8 h-px bg-foreground/10" />
          <span className="text-foreground/40 font-mono text-[10px] uppercase tracking-[0.2em]">
            {active.label}
          </span>
        </motion.div>

        {/* Rate cards */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
              className="h-full grid grid-cols-1 sm:grid-cols-3 gap-px bg-foreground/[0.06] border border-foreground/[0.06]"
            >
              {active.tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`
                    group relative bg-background flex flex-col justify-between
                    p-5 lg:p-6 xl:p-8 overflow-hidden
                    transition-colors duration-500 hover:bg-foreground/[0.015]
                    ${tier.bestValue ? 'bg-foreground/[0.012]' : ''}
                  `}
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="text-sm lg:text-base font-serif tracking-tight text-foreground">
                        {tier.name}
                      </h2>
                      {tier.bestValue && (
                        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/40 border border-foreground/10 px-1.5 py-0.5">
                          Best Value
                        </span>
                      )}
                    </div>

                    <p className="text-foreground/35 text-[9px] lg:text-[10px] font-mono uppercase tracking-[0.15em] mb-4 lg:mb-5">
                      {tier.duration}
                    </p>

                    <div className="mb-4 lg:mb-5">
                      <span className="text-xl lg:text-2xl xl:text-3xl font-serif tracking-tight text-foreground">
                        {tier.price}
                      </span>
                    </div>

                    <div className="w-6 h-px bg-foreground/10 mb-3 lg:mb-4" />

                    <ul className="space-y-1.5 lg:space-y-2 flex-1">
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className="text-foreground/45 text-[10px] lg:text-[11px] font-mono tracking-wide flex items-start gap-2"
                        >
                          <span className="text-foreground/15 mt-px shrink-0">—</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.note && (
                      <p className="mt-3 lg:mt-4 text-foreground/20 text-[9px] font-mono uppercase tracking-[0.15em] italic">
                        {tier.note}
                      </p>
                    )}
                  </div>

                  {/* Book button */}
                  <button
                    onClick={() =>
                      setBookingTier({
                        categoryId: active.id,
                        categoryLabel: active.label,
                        tierName: tier.name,
                        tierPrice: tier.price,
                      })
                    }
                    className="mt-4 lg:mt-5 flex items-center gap-2 text-foreground/40 hover:text-foreground text-[9px] lg:text-[10px] font-mono uppercase tracking-[0.2em] transition-all duration-300 group/cta shrink-0 cursor-pointer"
                  >
                    Book
                    <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover/cta:translate-x-1" />
                  </button>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEnquiry(true)}
              className="text-foreground/30 hover:text-foreground text-[9px] font-mono uppercase tracking-[0.2em] transition-colors flex items-center gap-1.5 group/enquire cursor-pointer"
            >
              Custom Packages
              <ArrowRight className="w-2.5 h-2.5 transition-transform duration-300 group-hover/enquire:translate-x-0.5" />
            </button>
            <span className="text-foreground/10">·</span>
            <button
              onClick={openTerms}
              className="text-foreground/30 hover:text-foreground text-[9px] font-mono uppercase tracking-[0.2em] transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
          </div>
          <p className="text-foreground/15 text-[9px] font-mono uppercase tracking-[0.15em]">
            bynk@outlook.com · +233 20 555 5084
          </p>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTerms && <TermsLightbox onClose={closeTerms} />}
      </AnimatePresence>

      <AnimatePresence>
        {bookingTier && (
          <BookingFormLightbox
            categoryId={bookingTier.categoryId}
            categoryLabel={bookingTier.categoryLabel}
            tierName={bookingTier.tierName}
            tierPrice={bookingTier.tierPrice}
            onClose={() => setBookingTier(null)}
            onOpenTerms={openTerms}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEnquiry && <EnquiryLightbox onClose={() => setShowEnquiry(false)} />}
      </AnimatePresence>

      <Suspense fallback={null}>
        <PaymentSuccessHandler />
      </Suspense>
    </main>
  );
}

/* ── Paystack Payment Success Return Handler ── */
function PaymentSuccessHandler() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const bookingId = searchParams.get('bookingId');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'payment_complete' && bookingId) {
      setOpen(true);
    }
  }, [status, bookingId]);

  if (!open || !bookingId) return null;

  const handleOpenWhatsapp = () => {
    const message = [
      `Hi BYNK! I have completed my 50% deposit payment on Paystack.`,
      ``,
      `Booking Reference: ${bookingId}`,
      `Please let me know once confirmed!`,
    ].join('\n');

    window.open(
      `https://wa.me/233205555084?text=${encodeURIComponent(message)}`,
      '_blank'
    );
    setOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-background border border-foreground/20 shadow-2xl shadow-black/50 p-6 rounded-none text-center space-y-4"
        >
          <div className="flex justify-center text-foreground">
            <CheckCircle2 className="w-12 h-12 stroke-[1.5]" />
          </div>

          <div>
            <p className="text-foreground/50 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              Payment Successful
            </p>
            <h2 className="text-xl font-serif tracking-tight text-foreground">
              50% Deposit Received!
            </h2>
          </div>

          <p className="text-foreground/70 text-xs font-mono leading-relaxed">
            Thank you! Your 50% booking deposit has been processed securely via Paystack. Your booking slot is now reserved.
          </p>

          <div className="bg-foreground/[0.04] border border-foreground/15 p-3 font-mono text-[10px] space-y-1">
            <div className="flex justify-between text-foreground/50">
              <span>Booking ID:</span>
              <span className="text-foreground font-semibold">{bookingId.slice(0, 13)}...</span>
            </div>
            <div className="flex justify-between text-foreground/50">
              <span>Payment Provider:</span>
              <span className="text-foreground">Paystack Ghana</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleOpenWhatsapp}
              className="w-full py-3 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.25em] hover:bg-foreground/90 transition-colors shadow-md cursor-pointer"
            >
              Send Confirmation to WhatsApp
            </button>

            <button
              onClick={() => setOpen(false)}
              className="w-full py-2.5 bg-transparent text-foreground/50 font-mono text-[9px] uppercase tracking-[0.2em] hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
