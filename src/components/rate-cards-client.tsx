'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';

// Custom SVG Icons from Downloads
function WeddingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" className={className}>
      <path d="M124.824,113.474c25.88,0,46.843-20.984,46.843-46.848c0-25.881-20.963-46.84-46.843-46.84 c-25.877,0-46.84,20.959-46.84,46.84C77.984,92.49,98.948,113.474,124.824,113.474z"/>
      <path d="M293.306,118.845h-9.61c0.158-0.748,0.32-1.53,0.499-2.395c3.305-15.896,10.434-49.682,14.15-64.066 c3.729-14.399,11.277-24.758,20.701-31.666c9.42-6.901,20.817-10.326,32.149-10.326c11.336,0,22.738,3.425,32.157,10.326 c9.424,6.908,16.968,17.267,20.702,31.666c2.473,9.569,6.476,27.826,9.835,43.581c1.683,7.898,3.209,15.181,4.315,20.484 c0.179,0.865,0.34,1.646,0.494,2.395h-9.61v10.392h22.36l-1.277-6.236c-0.003-0.008-2.738-13.377-6.114-29.206 c-3.376-15.821-7.37-34.044-9.935-44.013c-4.261-16.578-13.289-29.173-24.63-37.454C378.156,4.04,364.604,0,351.194,0 c-13.402,0-26.953,4.04-38.293,12.329c-11.336,8.281-20.364,20.876-24.625,37.454c-2.565,9.968-6.559,28.192-9.939,44.013 c-3.371,15.828-6.106,29.198-6.115,29.206l-1.28,6.236h22.364V118.845z"/>
      <path d="M351.194,27.061c-21.857,0-39.561,17.7-39.561,39.565c0,21.848,17.704,39.564,39.561,39.564 c21.866,0,39.573-17.716,39.573-39.564C390.767,44.761,373.06,27.061,351.194,27.061z"/>
      <polygon points="104.78,131.648 104.78,155.458 124.824,148.574 144.876,155.458 144.876,131.648 124.824,138.532"/>
      <path d="M437.923,321.342V177.897c0-11.398-6.24-23.345-15.31-32.382c-8.239-8.164-18.831-13.951-29.223-14.865 c-0.96-0.083-1.879-0.133-2.842-0.133h-9.674h-50.29c-2.44,0-4.88,0.133-7.274,0.407c-3.683,0.441-7.279,1.164-10.754,2.195 c-11.119,3.284-21.154,9.594-28.953,18.198c-4.352,4.747-7.989,10.235-10.79,16.303l-35.654,77.883l-35.654-77.9 c-6.905-15.09-19.254-26.554-34.099-32.514l-43.83,68.612l-46.345-72.537c-20.655,4.04-40.853,26.205-40.853,46.732v157.429 c0,11.348,9.195,20.56,20.543,20.56c5.586,0,0,0,14.341,0l7.806,134.258c0,12.072,9.802,21.857,21.878,21.857 c5.092,0,14.486,0,23.877,0c9.403,0,18.793,0,23.889,0c12.076,0,21.873-9.785,21.873-21.857l7.811-134.258l3.43-126.268 l41.165,89.954c1.243,2.71,6.048,8.92,13.984,8.92l0.009-0.008l0.008,0.016c8.356,0,13.074-6.202,14.312-8.929l40.222-87.826 l3.837,38.983c-9.237,14.507-60.57,93.787-66.443,174.264h82.43l4.802,49.134c0,8.796,7.112,15.912,15.945,15.912h34.826 c8.792,0,15.909-7.116,15.909-15.912l7.2-49.134h85.59C472.308,399.615,454.475,354.555,437.923,321.342z M240.401,434.599 c5.961-47.048,28.138-102.45,63.209-157.478l0.52-0.814l1.928-3.027l-0.353-3.567l-3.837-38.983l-7.441-75.604 c5.533-5.155,12.105-9.071,19.296-11.473c1.081,21.159,3.018,56.234,39.008,56.234c37.05,0,37.744-36.04,38.16-57.564 c0.009-0.474,0.016-0.94,0.025-1.397c0.541,0,1.064,0.033,1.554,0.075c6.199,0.548,13.156,3.725,19.28,8.713l-11.997,121.43 l-0.349,3.55l1.891,3.01l0.295,0.466c4.652,7.399,15.551,24.734,27.028,47.812c19.172,38.468,31.339,75.754,35.512,108.619H240.401 z"/>
    </svg>
  );
}

function RealEstateIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M10.7507 4.64035L6.3207 2.45035C3.9307 1.28035 1.9707 2.47035 1.9707 5.09035V19.9303C1.9707 21.0703 2.9207 22.0003 4.0807 22.0003H11.5007C12.0507 22.0003 12.5007 21.5503 12.5007 21.0003V7.41035C12.5007 6.36035 11.7107 5.11035 10.7507 4.64035ZM8.9707 13.7503H5.5007C5.0907 13.7503 4.7507 13.4103 4.7507 13.0003C4.7507 12.5903 5.0907 12.2503 5.5007 12.2503H8.9707C9.3807 12.2503 9.7207 12.5903 9.7207 13.0003C9.7207 13.4103 9.3907 13.7503 8.9707 13.7503ZM8.9707 9.75035H5.5007C5.0907 9.75035 4.7507 9.41035 4.7507 9.00035C4.7507 8.59035 5.0907 8.25035 5.5007 8.25035H8.9707C9.3807 8.25035 9.7207 8.59035 9.7207 9.00035C9.7207 9.41035 9.3907 9.75035 8.9707 9.75035Z" fill="currentColor"/>
      <path d="M22 18.0391V19.4991C22 20.8791 20.88 21.9991 19.5 21.9991H14.97C14.43 21.9991 14 21.5691 14 21.0291V18.8691C15.07 18.9991 16.2 18.6891 17.01 18.0391C17.69 18.5891 18.56 18.9191 19.51 18.9191C20.44 18.9191 21.31 18.5891 22 18.0391Z" fill="currentColor"/>
      <path d="M22 15.0505V15.0605C21.92 16.3705 20.85 17.4205 19.51 17.4205C18.12 17.4205 17.01 16.2905 17.01 14.9205C17.01 16.4505 15.6 17.6805 14 17.3705V12.0005C14 11.3605 14.59 10.8805 15.22 11.0205L17.01 11.4205L17.49 11.5305L19.53 11.9905C20.02 12.0905 20.47 12.2605 20.86 12.5105C20.86 12.5205 20.87 12.5205 20.87 12.5205C20.97 12.5905 21.16 12.6705 21.16 12.7605C21.62 13.2205 21.92 13.8905 21.99 14.8705C21.99 14.9305 22 14.9905 22 15.0505Z" fill="currentColor"/>
    </svg>
  );
}

function PortraitIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 511.999 511.999" fill="currentColor" className={className}>
      <path d="M448.29,171.495c11.242-14.095,15.428-33.596,11.197-52.164 c-2.612-11.459-8.342-22.876-13.883-33.922c-11.684-23.285-22.721-45.28-8.79-69.407c2.946-5.102,1.198-11.625-3.904-14.572 c-5.102-2.944-11.625-1.198-14.572,3.904c-19.68,34.084-4.223,64.89,8.197,89.644c5.2,10.363,10.113,20.154,12.151,29.091 c1.05,4.608,3.644,20.685-7.074,34.119c-9.577,12.005-27.727,18.649-52.631,19.337l-15.249-15.249V10.668 C363.732,4.776,358.956,0,353.065,0h-42.668c-5.892,0-10.668,4.776-10.668,10.668v106.194c-0.175-0.002-0.352-0.011-0.527-0.011 c-12.314,0-23.864,4.767-32.521,13.426l-93.757,93.76L58.593,257.157c-3.623,1.05-6.423,3.935-7.363,7.588 c-0.94,3.655,0.121,7.534,2.788,10.201l63.618,63.618c-5.312,29.673,4.005,59.628,25.535,81.156 c17.374,17.376,40.476,26.944,65.049,26.944c5.399,0,10.79-0.479,16.097-1.419l63.627,63.63c2.027,2.025,4.75,3.123,7.544,3.123 c0.885,0,1.777-0.11,2.656-0.335c3.653-0.94,6.54-3.74,7.588-7.363l33.122-114.326l28.921-28.921c0.002,0,0.004-0.002,0.004-0.004 c0.002-0.002,0.004-0.004,0.006-0.004l64.828-64.83c17.937-17.937,17.937-47.121,0-65.057l-33.965-33.965 C420.764,193.738,437.408,185.136,448.29,171.495z M158.258,404.636c-12.593-12.593-19.748-28.942-20.642-46.091l66.678,66.678 C186.896,424.277,170.674,417.052,158.258,404.636z M321.064,21.335h21.333v145.362v67.97h-21.333V129.319V21.335z M290.266,481.024l-57.493-57.494l-95.959-95.96c-0.002-0.002-0.006-0.004-0.009-0.009l-54.936-54.936l35.087-10.163l51.637,51.633 c2.083,2.083,4.813,3.126,7.543,3.126c2.731,0,5.46-1.042,7.543-3.126c4.166-4.165,4.165-10.919,0-15.087l-43.329-43.324 l35.09-10.165l141.933,141.933L290.266,481.024z M417.527,281.128l-57.29,57.292l-26.245-26.246 c-4.165-4.167-10.919-4.165-15.085,0c-4.167,4.165-4.167,10.919-0.002,15.085l26.246,26.245l-15.774,15.776L193.613,233.518 l88.154-88.155c4.75-4.752,11.201-7.317,17.962-7.174v107.143c0,5.89,4.776,10.668,10.668,10.668h42.668 c5.892,0,10.668-4.778,10.668-10.668v-52.885l3.349,3.351c0.006,0.004,0.011,0.011,0.017,0.015l50.431,50.431 C427.145,255.861,427.145,271.511,417.527,281.128z"/>
    </svg>
  );
}

function EventIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 5C6 3.89543 6.89543 3 8 3H16C17.1046 3 18 3.89543 18 5V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V5Z" />
      <path d="M15 15C15 16.6569 13.6569 18 12 18C10.3431 18 9 16.6569 9 15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15Z" />
      <path d="M13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8Z" />
    </svg>
  );
}

interface RatePackage {
  id: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface CategoryTab {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  icon: React.ReactNode;
  addOns?: string;
  packages: RatePackage[];
}

const categoryTabs: CategoryTab[] = [
  {
    id: 'weddings',
    name: 'Weddings',
    subtitle: 'Curated wedding collections & editorial romance',
    tag: '01',
    icon: <WeddingIcon />,
    addOns: 'Extra hour: GHS 800–1,200 • Express delivery: GHS 1,500 • Additional photographer: GHS 1,500 • Highlight video: GHS 2,000+ • Custom album: GHS 2,500+',
    packages: [
      {
        id: 'w-signature',
        title: 'Signature',
        price: 'GHS 8,000',
        description: 'Perfect for intimate & modern weddings',
        features: [
          'Up to 6 hours coverage',
          '1 professional photographer',
          'Ceremony, portraits & reception',
          '250+ professionally edited images',
          'Online gallery (HD download)',
          'Delivery within 14 days',
        ],
      },
      {
        id: 'w-deluxe',
        title: 'Deluxe',
        price: 'GHS 13,500',
        popular: true,
        description: 'For couples who want full storytelling',
        features: [
          'Full-day coverage (10–12 hours)',
          '2 photographers (main + assistant)',
          'Bridal prep, ceremony & reception',
          '450+ professionally edited images',
          'Pre-wedding consultation & slideshow',
          'Delivery within 10–14 days',
        ],
      },
      {
        id: 'w-forbes',
        title: 'Forbes',
        price: 'GHS 20,000+',
        description: 'Luxury experience for high-end weddings',
        features: [
          'Full-day + extended coverage',
          '2–3 photographers + creative direction',
          '600–800+ professionally edited images',
          'Engagement shoot & drone coverage',
          'Luxury premium print album',
          'Express 48h preview (7–10 day gallery)',
        ],
      },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    subtitle: 'Architectural, luxury estate & interior capture',
    tag: '02',
    icon: <RealEstateIcon />,
    addOns: 'Extra images: GHS 20–40/img • Same-day delivery: GHS 800 • Drone only: GHS 1,200 • Full walkthrough video: GHS 2,000+',
    packages: [
      {
        id: 're-signature',
        title: 'Signature',
        price: 'GHS 1,200',
        description: 'Best for small properties & quick listings',
        features: [
          'Up to 1 hour shoot time',
          'Interior + exterior coverage',
          '15 professionally edited images',
          'Basic color & lighting enhancement',
          'Optimized for listings (Airbnb, Jiji)',
          'Delivery within 48 hours',
        ],
      },
      {
        id: 're-deluxe',
        title: 'Deluxe',
        price: 'GHS 2,800',
        popular: true,
        description: 'For realtors & developers who want impact',
        features: [
          'Up to 2–3 hours shoot time',
          'Full interior + exterior coverage',
          '20-25 edited images',
          'Advanced editing (HDR, perspective)',
          'Short vertical video (30–45s social)',
          'Delivery within 24–48 hours',
        ],
      },
      {
        id: 're-forbes',
        title: 'Forbes',
        price: 'GHS 5,500+',
        description: 'For luxury homes & high-end listings',
        features: [
          'Half-day production (3–5 hours)',
          'Full coverage + creative direction',
          '35 magazine-style edited images',
          'Drone aerials + twilight shots',
          'Cinematic video (60–90s)',
          'Express 24h preview (2–3 day delivery)',
        ],
      },
    ],
  },
  {
    id: 'portraits',
    name: 'Portraits',
    subtitle: 'High fashion, studio & personal portraiture',
    tag: '03',
    icon: <PortraitIcon />,
    addOns: 'Extra image: GHS 30–60 • Express delivery (24h): GHS 500 • Makeup artist (MUA): GHS 400–800 • BTS video: GHS 500+',
    packages: [
      {
        id: 'p-signature',
        title: 'Signature',
        price: 'GHS 1,300',
        description: 'Perfect for simple, clean portraits',
        features: [
          'Up to 45 minutes session',
          '1 studio setup & 1 outfit',
          '8 professionally edited images',
          '2 skin & lighting retouched images',
          'Headshots, birthdays & casuals',
          'Delivery within 3–5 days',
        ],
      },
      {
        id: 'p-deluxe',
        title: 'Deluxe',
        price: 'GHS 2,400',
        popular: true,
        description: 'For stylish, expressive portrait sessions',
        features: [
          'Up to 1.5–2 hours session',
          '2–3 creative setups & 2 outfits',
          '15 edited images',
          '5 skin & tone retouched images',
          'Posing & creative direction',
          'Delivery within 3–4 days',
        ],
      },
      {
        id: 'p-forbes',
        title: 'Forbes',
        price: 'GHS 3,500+',
        description: 'Luxury editorial & high-end personal branding',
        features: [
          'Up to 3–4 hours session',
          'Multiple concepts & 3–5 outfits',
          '25+ high-end edited images',
          '12 Magazine-quality retouched images',
          'Creative direction & planning',
          'Express 24h preview (2–3 day delivery)',
        ],
      },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    subtitle: 'Documentary coverage, galas & live shows',
    tag: '04',
    icon: <EventIcon />,
    addOns: 'Extra hour: GHS 700–1,200 • Express delivery (24h): GHS 1,000 • Drone coverage: GHS 1,200+ • Full event video: GHS 2,000+ • Instant live sharing',
    packages: [
      {
        id: 'ev-signature',
        title: 'Signature',
        price: 'GHS 2,500',
        description: 'For small, private & short events',
        features: [
          'Up to 4 hours coverage',
          '1 professional photographer',
          'Key moments & guest interactions',
          '40 professionally edited images',
          'Online gallery delivery',
          'Delivery within 3–5 days',
        ],
      },
      {
        id: 'ev-deluxe',
        title: 'Deluxe',
        price: 'GHS 4,500',
        popular: true,
        description: 'For full event coverage & storytelling',
        features: [
          'Up to 7 hours coverage',
          '1–2 photographers',
          'Full arrival, main & crowd highlights',
          '55 edited images & slideshow',
          'Priority editing turnaround',
          'Delivery within 2–4 days',
        ],
      },
      {
        id: 'ev-forbes',
        title: 'Forbes',
        price: 'GHS 7,500+',
        description: 'For large-scale & premium productions',
        features: [
          'Up to 10–12 hours coverage',
          '2–3 photographers',
          'Full start → peak → closing story',
          '85+ high-end edited images',
          'Short cinematic video (30–60s)',
          'Express 24h preview (2–3 day gallery)',
        ],
      },
    ],
  },
];

export default function RateCardsClient() {
  const [activeTabId, setActiveTabId] = useState<string>('weddings');

  const currentTab = categoryTabs.find((tab) => tab.id === activeTabId) || categoryTabs[0];

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center z-10 h-full max-h-screen py-3 sm:py-6">
      {/* Ambient Emerald & Architectural Sage Green Background Glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-emerald-600/10 via-teal-600/10 to-transparent rounded-full filter blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center space-y-1.5 mb-6 sm:mb-9 max-w-xl shrink-0"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
          {currentTab.name}
        </h1>
        <p className="text-foreground/50 text-[11px] sm:text-xs font-mono tracking-wider max-w-md mx-auto">
          {currentTab.subtitle}
        </p>
      </motion.div>

      {/* Cards Grid Switcher with AnimatePresence */}
      <div className="w-full flex items-center justify-center mb-4 sm:mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full items-stretch"
          >
            {currentTab.packages.map((pkg, index) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between h-[410px] sm:h-[430px] p-5 sm:p-6 rounded-none border transition-all duration-500 ${
                  pkg.popular
                    ? 'border-emerald-500/40 dark:border-emerald-400/40 bg-emerald-500/[0.02] dark:bg-emerald-400/[0.03] shadow-lg shadow-emerald-500/5'
                    : 'border-foreground/10 bg-foreground/[0.01] hover:border-emerald-500/30 hover:bg-foreground/[0.02]'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-mono text-[8px] uppercase tracking-[0.2em] font-semibold shadow-md shadow-emerald-500/20">
                    Most Requested
                  </span>
                )}

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="space-y-1 shrink-0">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-600/70 dark:text-emerald-400/70 font-semibold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif tracking-tight text-foreground">
                      {pkg.title}
                    </h3>
                  </div>

                  <div className="font-mono text-base font-medium text-emerald-700 dark:text-emerald-400 pb-2.5 border-b border-foreground/10 shrink-0">
                    {pkg.price}
                  </div>

                  <p className="text-[11px] text-foreground/60 leading-relaxed font-sans min-h-[32px] shrink-0">
                    {pkg.description}
                  </p>

                  <ul className="space-y-2 pt-1 flex-1 flex flex-col justify-start">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[11px] text-foreground/80 font-mono">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 mt-3 border-t border-foreground/10 shrink-0">
                  <Link
                    href="/me"
                    className="group w-full py-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 transition-colors"
                  >
                    <span>Inquire Session</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Block (Add-Ons & Bespoke Note) */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-2 mt-4 sm:mt-6 shrink-0 text-center">
        {/* Add-Ons Summary */}
        {currentTab.addOns && (
          <motion.div
            key={`addons-${currentTab.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60"
          >
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold mr-1.5">ADD-ONS:</span>
            {currentTab.addOns}
          </motion.div>
        )}

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/50 max-w-xl mt-3 sm:mt-4"
        >
          If you have something more bespoke in mind, speak to my{' '}
          <Link href="/me" className="underline underline-offset-4 decoration-emerald-400/50 hover:decoration-emerald-400 transition-colors text-emerald-700 dark:text-emerald-400 font-medium">
            service bot
          </Link>
          .
        </motion.p>
      </div>

      {/* Side Dock / Tab Switcher (Desktop Right Dock / Mobile Bottom Bar) */}
      <div className="fixed right-auto lg:right-8 bottom-6 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 z-40 w-full lg:w-auto flex flex-row lg:flex-col items-center justify-center gap-4 sm:gap-5 pointer-events-auto">
        {categoryTabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              aria-label={tab.name}
              className={`group relative p-3 rounded-full border transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${
                isActive
                  ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25 scale-110 ring-2 ring-emerald-400/30'
                  : 'bg-background/80 text-foreground/40 border-foreground/10 hover:text-emerald-600 hover:border-emerald-400/30 hover:bg-emerald-500/5'
              }`}
            >
              <div className="transition-colors">
                {tab.icon}
              </div>

              {/* Tooltip on Hover */}
              <span className="absolute right-full mr-3 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none font-mono text-[10px] uppercase tracking-[0.2em] bg-foreground text-background px-2.5 py-1 whitespace-nowrap shadow-md">
                {tab.name}
              </span>

              {/* Active Indicator Pulse Ring */}
              {isActive && (
                <motion.span
                  layoutId="activeCategoryIndicator"
                  className="absolute -inset-1 rounded-full border border-emerald-400/60 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
