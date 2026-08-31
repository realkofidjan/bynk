'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPasscode } from '@/app/gallery/actions';
import { Shoot } from '@/lib/shoots';
import { Download, Info, Loader2, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
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
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

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
                  {shoot.images.length} High-Res Photos · Click any photo to view full image
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-foreground/10 pt-2 sm:pt-0">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-2 bg-foreground text-background font-mono text-[10px] uppercase tracking-widest hover:bg-foreground/90 transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All (.zip)
                </button>
                <button
                  onClick={() => setShoot(null)}
                  aria-label="Close"
                  className="p-2 bg-transparent text-foreground/50 hover:text-foreground transition-colors border-0 outline-none focus:outline-none cursor-pointer shrink-0"
                  title="Back to passcode entry"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>
            </div>

            {/* Gallery Photos Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 pr-1 pb-16 custom-scrollbar">
              {shoot.images.map((image, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  key={image.src}
                  onClick={() => setActiveImageIndex(index)}
                  className="relative group aspect-[3/4] bg-neutral-950 border border-foreground/10 hover:border-foreground/40 overflow-hidden cursor-pointer"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    unoptimized
                    className="object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  
                  <a
                    href={image.src}
                    download={image.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/75 backdrop-blur-md text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-out hover:bg-black shadow-md cursor-pointer"
                    title={`Download ${image.filename}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </motion.div>
              ))}
            </div>

            {/* Full-Screen Lightbox */}
            <AnimatePresence>
              {activeImageIndex !== null && shoot.images[activeImageIndex] && (
                <div
                  className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
                  onClick={() => setActiveImageIndex(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative max-w-6xl max-h-[92vh] w-full h-full flex flex-col items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top Controls */}
                    <div className="absolute top-2 inset-x-2 z-20 flex items-center justify-between pointer-events-auto">
                      <span className="px-3 py-1 bg-black/70 backdrop-blur-md text-white/90 text-xs font-mono">
                        {activeImageIndex + 1} / {shoot.images.length} · {shoot.images[activeImageIndex].filename}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={shoot.images[activeImageIndex].src}
                          download={shoot.images[activeImageIndex].filename}
                          className="px-3 py-1.5 bg-white text-black font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/90 cursor-pointer shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                        <button
                          onClick={() => setActiveImageIndex(null)}
                          className="p-1.5 bg-black/70 hover:bg-black text-white cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Previous Button */}
                    {shoot.images.length > 1 && (
                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === null || prev === 0 ? shoot.images.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-2 z-20 p-2.5 bg-black/60 hover:bg-black text-white backdrop-blur-md cursor-pointer transition-colors"
                        title="Previous Photo"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}

                    {/* Full Photo */}
                    <div className="relative w-full h-full max-h-[82vh] flex items-center justify-center p-2">
                      <img
                        src={shoot.images[activeImageIndex].src}
                        alt={shoot.images[activeImageIndex].alt}
                        className="max-h-[80vh] max-w-full object-contain shadow-2xl"
                      />
                    </div>

                    {/* Next Button */}
                    {shoot.images.length > 1 && (
                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === null || prev === shoot.images.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-2 z-20 p-2.5 bg-black/60 hover:bg-black text-white backdrop-blur-md cursor-pointer transition-colors"
                        title="Next Photo"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
