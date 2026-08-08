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
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center z-10 min-h-[60vh] justify-center">
      <AnimatePresence mode="wait">
        {!shoot ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center text-center space-y-10"
          >
            {/* Minimal heading */}
            <div className="space-y-3">
              <h1 className="text-2xl font-serif tracking-tight text-foreground">
                Enter your shoot code
              </h1>
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-[0.2em]">
                6-digit access code
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex flex-col items-center gap-6">
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

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-foreground/50"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs font-mono uppercase tracking-widest">Verifying</span>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500/80 text-xs font-mono uppercase tracking-widest"
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
            className="w-full flex flex-col space-y-12 pb-24"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-foreground/10 pb-8 mt-12">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif tracking-tight">{shoot.clientInfo}</h1>
                <p className="text-foreground/60 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  {shoot.images.length} Photos Included
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
                <button
                  onClick={() => setShoot(null)}
                  className="flex items-center justify-center w-10 h-10 hover:bg-foreground/5 transition-all shrink-0"
                  title="Back to passcode entry"
                >
                  <X className="w-4 h-4 text-foreground/60" />
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shoot.images.map((image, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={image.src}
                  className={`relative group aspect-[4/5] bg-foreground/5 overflow-hidden ${
                    index % 5 === 0 ? 'md:col-span-2 md:row-span-2 md:aspect-auto' : ''
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                  <a
                    href={image.src}
                    download={image.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out hover:bg-black/80"
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
