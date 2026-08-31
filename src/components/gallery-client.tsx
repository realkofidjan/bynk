'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPasscode } from '@/app/gallery/actions';
import { Shoot } from '@/lib/shoots';
import { Download, Info, Loader2, X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
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
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const handleComplete = useCallback(
    async (value: string) => {
      if (loading) return;

      setLoading(true);
      setError('');

      try {
        const result = await verifyPasscode(value);
        if (result.success && result.shoot) {
          setShoot(result.shoot);
        } else {
          setError(result.error || 'Invalid passcode. Please check and try again.');
        }
      } catch {
        setError('An error occurred while verifying passcode. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleDownloadZip = () => {
    if (!shoot) return;
    window.location.href = `/api/download?code=${encodeURIComponent(shoot.passcode)}`;
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (activeImageIndex === null || !shoot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev === null || prev === 0 ? shoot.images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev === null || prev === shoot.images.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, shoot]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center z-10 h-full max-h-full min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {!shoot ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center text-center space-y-8 max-w-md w-full my-auto py-12"
          >
            {/* Lock Icon & Heading */}
            <div className="space-y-3 flex flex-col items-center">
              <div className="p-3 bg-foreground/5 border border-foreground/15 rounded-full">
                <Lock className="w-6 h-6 text-foreground/70" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground">
                Private Client Gallery
              </h1>
              <p className="text-foreground/50 text-xs font-mono uppercase tracking-[0.2em]">
                Enter your 6-digit access code
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex flex-col items-center gap-5 w-full">
              <div className="transform scale-[0.9] sm:scale-100 transition-transform">
                <InputOTP maxLength={6} onComplete={handleComplete} disabled={loading}>
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
                  <span className="text-[10px] font-mono uppercase tracking-widest">Verifying Passcode...</span>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs font-mono tracking-wide"
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
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col h-full min-h-0 space-y-4 sm:space-y-6 overflow-hidden"
          >
            {/* PINNED HEADER BAR */}
            <div className="shrink-0 w-full flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-foreground/15 pb-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif tracking-tight text-foreground">
                  {shoot.clientInfo}
                </h1>
                <p className="text-foreground/60 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  {shoot.images.length} High-Res Photos · Click any photo to view full screen
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-foreground/10 pt-2.5 sm:pt-0">
                <button
                  onClick={handleDownloadZip}
                  className="flex items-center gap-2 px-3.5 py-2 bg-foreground text-background font-mono text-xs uppercase tracking-wider font-semibold hover:bg-foreground/90 transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All (.zip)
                </button>
                <button
                  onClick={() => setShoot(null)}
                  className="p-2 border border-foreground/20 hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                  title="Lock gallery & switch shoot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ONLY IMAGES SCROLLABLE CONTAINER */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 pb-6 custom-scrollbar overscroll-contain">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-12">
                {shoot.images.map((image, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    key={image.src}
                    onClick={() => setActiveImageIndex(index)}
                    className="relative aspect-[3/4] w-full bg-neutral-950 border border-foreground/15 hover:border-foreground/50 overflow-hidden cursor-pointer group shadow-sm transition-all select-none"
                  >
                    {/* Bounded uncropped photo */}
                    <div className="absolute inset-0 flex items-center justify-center p-1.5 overflow-hidden">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="max-w-full max-h-full w-auto h-auto object-contain block mx-auto transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 pointer-events-none" />

                    {/* Bottom Download Icon Button */}
                    <a
                      href={image.src}
                      download={image.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-black/80 backdrop-blur-md text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-out hover:bg-black shadow-md cursor-pointer"
                      title={`Download ${image.filename}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Filename caption */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-3 text-[9px] font-mono text-white/90 truncate pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="truncate block">{image.filename}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* FULL-SCREEN LIGHTBOX MODAL */}
            <AnimatePresence>
              {activeImageIndex !== null && shoot.images[activeImageIndex] && (
                <div
                  className="fixed inset-0 z-[100] bg-neutral-950/98 backdrop-blur-2xl flex flex-col justify-between pt-20 sm:pt-24 pb-6 px-4 sm:px-8 lg:px-12 overscroll-contain select-none"
                  onClick={() => setActiveImageIndex(null)}
                >
                  {/* Dedicated Top Control Bar */}
                  <div
                    className="w-full flex items-center justify-between z-20 shrink-0 pb-3 border-b border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white font-mono text-xs tracking-wider border border-white/10">
                        {activeImageIndex + 1} / {shoot.images.length}
                      </span>
                      <span className="text-white/70 font-mono text-xs hidden sm:inline truncate max-w-sm">
                        {shoot.images[activeImageIndex].filename}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={shoot.images[activeImageIndex].src}
                        download={shoot.images[activeImageIndex].filename}
                        className="px-4 py-2 bg-white text-black font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors cursor-pointer shadow-xl"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                      <button
                        onClick={() => setActiveImageIndex(null)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
                        title="Close preview (Esc)"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Centered Photo & Navigation */}
                  <div
                    className="relative flex-1 w-full flex items-center justify-center min-h-0 my-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Previous Button */}
                    {shoot.images.length > 1 && (
                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === null || prev === 0 ? shoot.images.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-1 sm:left-4 z-30 p-3 sm:p-4 bg-black/75 hover:bg-black text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-2xl hover:scale-105"
                        title="Previous Photo (Left Arrow)"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}

                    {/* Image */}
                    <img
                      src={shoot.images[activeImageIndex].src}
                      alt={shoot.images[activeImageIndex].alt}
                      className="max-h-full max-w-full w-auto h-auto object-contain block mx-auto shadow-2xl"
                    />

                    {/* Next Button */}
                    {shoot.images.length > 1 && (
                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === null || prev === shoot.images.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-1 sm:right-4 z-30 p-3 sm:p-4 bg-black/75 hover:bg-black text-white backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-2xl hover:scale-105"
                        title="Next Photo (Right Arrow)"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {/* Mobile Filename Caption */}
                  <div className="sm:hidden text-center text-[10px] font-mono text-white/50 truncate pt-1 shrink-0">
                    {shoot.images[activeImageIndex].filename}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
