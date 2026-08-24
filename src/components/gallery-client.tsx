'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPasscode } from '@/app/gallery/actions';
import { Shoot } from '@/lib/shoots';
import { Download, Info, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/interfaces-input-otp';

export default function GalleryClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shoot, setShoot] = useState<Shoot | null>(null);

  const handleComplete = useCallback(async (value: string) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await verifyPasscode(value);
      if (result.success && result.shoot) {
        setShoot(result.shoot);
      } else {
        setError(result.error || 'Invalid passcode');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleDownload = () => {
    if (!shoot) return;
    window.location.href = `/api/download?code=${encodeURIComponent(shoot.passcode)}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center z-10 h-full max-h-full justify-center px-4 pt-16 sm:pt-20 pb-6 overflow-hidden">
      <AnimatePresence mode="wait">
        {!shoot ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center text-center space-y-8 max-w-md w-full"
          >
            {/* Minimal heading */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-foreground">
                Enter your shoot code
              </h1>
              <p className="text-foreground/40 text-[10px] font-mono uppercase tracking-[0.2em]">
                6-digit access code
              </p>
            </div>

            {/* OTP Input - Scaled for Mobile */}
            <div className="flex flex-col items-center gap-5 w-full">
              <div className="transform scale-[0.85] xs:scale-95 sm:scale-100 transition-transform">
                <InputOTP
                  maxLength={6}
                  onComplete={handleComplete}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-foreground/50"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Verifying Passcode</span>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500/90 text-[10px] font-mono uppercase tracking-widest"
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full flex flex-col space-y-6 h-full min-h-0 overflow-hidden"
          >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-foreground/15 pb-4 shrink-0">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-tight">{shoot.clientInfo}</h1>
                <p className="text-foreground/60 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  {shoot.images.length} High-Res Photos
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-foreground/10 pt-2 sm:pt-0">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-2 bg-foreground text-background font-mono text-[10px] uppercase tracking-widest hover:bg-foreground/90 transition-colors shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All (.zip)
                </button>
                <button
                  onClick={() => setShoot(null)}
                  className="flex items-center justify-center w-8 h-8 border border-foreground/20 hover:bg-foreground/5 transition-all shrink-0"
                  title="Back to passcode entry"
                >
                  <X className="w-4 h-4 text-foreground/60" />
                </button>
              </div>
            </div>

            {/* Gallery Photos Grid - Scrollable internally */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1 pb-16">
              {shoot.images.map((image, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  key={image.src}
                  className={`relative group aspect-[4/5] bg-foreground/5 overflow-hidden rounded-none ${
                    index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2 sm:aspect-auto min-h-[260px]' : ''
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />
                  <a
                    href={image.src}
                    download={image.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/75 backdrop-blur-md text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-out hover:bg-black/90 shadow-md"
                    title={`Download ${image.filename}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
