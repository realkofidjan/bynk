'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, Heart, Sparkles, Building, MapPin, X } from 'lucide-react';

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
    title: 'Booking',
    content:
      'A 50% non-refundable booking fee is required to secure your date. A date is only considered confirmed once payment has been received. The remaining balance must be settled before photography coverage begins unless another arrangement has been agreed upon in writing.',
  },
  {
    number: '02',
    title: 'Rescheduling',
    content:
      'Clients may request to reschedule their booking subject to reasonable notice and availability. The booking fee may be transferred to one alternative date where reasonable notice is provided. If the requested alternative date is unavailable, the booking may be treated as cancelled.',
  },
  {
    number: '03',
    title: 'Cancellation',
    content:
      'Booking fees are non-refundable because they reserve the photographer\'s time and prevent the date from being offered to another client. Cancellation of a confirmed booking does not automatically entitle the client to a refund of the booking fee.',
  },
  {
    number: '04',
    title: 'Client Delays',
    content:
      'Photography coverage begins at the agreed start time. Client delays do not automatically extend the booked coverage period. Where additional time is available, overtime may be charged at the applicable hourly rate.',
  },
  {
    number: '05',
    title: 'Overtime',
    content:
      'Coverage beyond the selected package duration is subject to photographer availability. Additional hours are charged at the applicable overtime rate.',
  },
  {
    number: '06',
    title: 'Image Delivery',
    content:
      'Estimated delivery timelines: Studio 5–10 working days; Real Estate 5–7 working days; Events 7–14 working days; Weddings 14–30 working days. Delivery times may vary depending on workload, assignment size and complexity. Rush delivery is available at an additional charge.',
  },
  {
    number: '07',
    title: 'Image Selection & Retouching',
    content:
      'The number of professionally retouched photographs included in each package is clearly stated. Additional retouching may be purchased separately. Complex manipulation, extensive object removal or advanced Photoshop work may attract an additional charge.',
  },
  {
    number: '08',
    title: 'RAW Files',
    content:
      'RAW/unprocessed camera files are not included in any package. Clients receive the professionally processed final images specified in their selected package.',
  },
  {
    number: '09',
    title: 'Delivery & Backup',
    content:
      'Final photographs will be delivered through a private online gallery or agreed digital delivery method. Clients are responsible for downloading and securely backing up their photographs after delivery.',
  },
  {
    number: '10',
    title: 'Copyright',
    content:
      'BYNK retains copyright ownership of all photographs created during an assignment unless otherwise agreed in writing. Clients receive a personal-use licence for delivered photographs. Commercial advertising, resale, publication or third-party licensing may require an additional commercial usage agreement.',
  },
  {
    number: '11',
    title: 'Portfolio Use',
    content:
      'BYNK may use selected photographs for portfolio, website, social media, advertising and promotional purposes. Clients requiring complete privacy must communicate this before the photography session or event.',
  },
  {
    number: '12',
    title: 'Weddings',
    content:
      'Clients are encouraged to provide a final wedding timeline before the event. Major changes to the agreed schedule or additional ceremonies may require additional coverage fees.',
  },
  {
    number: '13',
    title: 'Outdoor Sessions & Weather',
    content:
      'For outdoor sessions, weather conditions may require the session to be rescheduled or moved to an alternative location. Rescheduling remains subject to availability.',
  },
  {
    number: '14',
    title: 'Venue & Third-Party Costs',
    content:
      'Unless explicitly stated in the selected package, the client is responsible for venue fees, location permits, entrance fees, parking fees and other third-party charges.',
  },
  {
    number: '15',
    title: 'Equipment & Unforeseen Circumstances',
    content:
      'BYNK takes reasonable measures to maintain professional equipment and backup arrangements. In the unlikely event of equipment failure, illness, accident or another circumstance beyond reasonable control, every reasonable effort will be made to complete the assignment or provide an appropriate alternative.',
  },
  {
    number: '16',
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
  const [date, setDate] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  const availableAddOns = categoryAddOns[categoryId] || [];

  // Base price extraction
  const basePriceNum = parseInt(tierPrice.replace(/[^0-9]/g, ''), 10) || 0;
  const selectedAddOnsList = availableAddOns.filter((addon) =>
    selectedAddOnIds.includes(addon.id)
  );
  const addOnsTotal = selectedAddOnsList.reduce((sum, item) => sum + item.price, 0);
  const totalPriceNum = basePriceNum + addOnsTotal;

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isValid = name.trim() && email.trim() && phone.trim() && date && agreedToTerms;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const addOnsText =
      selectedAddOnsList.length > 0
        ? selectedAddOnsList
            .map((item) => `  - ${item.name} (+ GHS ${item.price.toLocaleString()})`)
            .join('\n')
        : '  None';

    const message = [
      `Hi, I'd like to book a session.`,
      ``,
      `Package: ${categoryLabel} — ${tierName} (${tierPrice})`,
      `Selected Add-ons:\n${addOnsText}`,
      `Estimated Total: GHS ${totalPriceNum.toLocaleString()}`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Preferred Date: ${date}`,
      ``,
      `I have read and agreed to the terms and conditions.`,
    ].join('\n');

    window.open(
      `https://wa.me/233205555084?text=${encodeURIComponent(message)}`,
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
    'w-full bg-transparent border border-foreground/10 px-3 py-2.5 text-foreground text-[11px] font-mono tracking-wide placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 transition-colors';

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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[85vh] bg-background border border-foreground/[0.08] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/[0.06] shrink-0">
          <div>
            <p className="text-foreground/40 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              {categoryLabel} · {tierName}
            </p>
            <h2 className="text-lg font-serif tracking-tight text-foreground">
              Book This Session
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/30 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Package summary & Total Price */}
          <div className="bg-foreground/[0.02] border border-foreground/[0.06] p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-foreground/50 text-[10px] font-mono uppercase tracking-[0.15em]">
                Base Package ({tierName})
              </span>
              <span className="text-foreground font-serif text-sm">
                {tierPrice}
              </span>
            </div>

            {selectedAddOnsList.length > 0 && (
              <div className="flex items-baseline justify-between pt-1 border-t border-foreground/[0.04] text-[10px] font-mono">
                <span className="text-foreground/40 uppercase tracking-wider">
                  Add-ons ({selectedAddOnsList.length})
                </span>
                <span className="text-foreground/70">
                  + GHS {addOnsTotal.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between pt-2 border-t border-foreground/10">
              <span className="text-foreground text-[10px] font-mono uppercase tracking-[0.2em] font-semibold">
                Total Price
              </span>
              <span className="text-foreground font-serif text-base font-semibold">
                GHS {totalPriceNum.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add-ons selection section */}
          {availableAddOns.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="block text-foreground/40 text-[9px] font-mono uppercase tracking-[0.25em]">
                Optional Add-Ons
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-foreground/10 p-2 divide-y divide-foreground/[0.04]">
                {availableAddOns.map((addon) => {
                  const isChecked = selectedAddOnIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className="flex items-center justify-between py-1.5 px-1 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddOn(addon.id)}
                          className="w-3.5 h-3.5 accent-foreground cursor-pointer shrink-0"
                        />
                        <span className="text-foreground/70 text-[10px] font-mono tracking-wide">
                          {addon.name}
                        </span>
                      </div>
                      <span className="text-foreground/50 text-[10px] font-mono shrink-0 pl-2">
                        {addon.priceLabel || `+ GHS ${addon.price.toLocaleString()}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
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

          {/* Email */}
          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
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

          {/* Phone */}
          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
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

          {/* Preferred Date */}
          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
              Preferred Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClasses} appearance-none`}
              required
            />
          </div>

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
              className="text-foreground/40 text-[10px] font-mono tracking-wide cursor-pointer leading-relaxed"
            >
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={onOpenTerms}
                className="text-foreground/60 underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Terms &amp; Conditions
              </button>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className={`
              w-full py-3 mt-2 font-mono text-[10px] uppercase tracking-[0.25em] 
              border transition-all duration-300
              ${
                isValid
                  ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 cursor-pointer'
                  : 'bg-transparent text-foreground/20 border-foreground/10 cursor-not-allowed'
              }
            `}
          >
            Book via WhatsApp
          </button>

          <p className="text-foreground/15 text-[9px] font-mono uppercase tracking-[0.15em] text-center pt-1">
            50% booking fee required to confirm
          </p>
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
    'w-full bg-transparent border border-foreground/10 px-3 py-2.5 text-foreground text-[11px] font-mono tracking-wide placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 transition-colors';

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-background border border-foreground/[0.08]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/[0.06]">
          <div>
            <p className="text-foreground/40 text-[9px] font-mono uppercase tracking-[0.3em] mb-1">
              Custom Packages
            </p>
            <h2 className="text-lg font-serif tracking-tight text-foreground">
              Send an Enquiry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/30 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClasses}
              required
            />
          </div>

          <div>
            <label className="block text-foreground/30 text-[9px] font-mono uppercase tracking-[0.25em] mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you're looking for — type of shoot, location, number of people, any special requirements..."
              rows={5}
              className={`${inputClasses} resize-none leading-relaxed`}
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
                  ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 cursor-pointer'
                  : 'bg-transparent text-foreground/20 border-foreground/10 cursor-not-allowed'
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
    </main>
  );
}
