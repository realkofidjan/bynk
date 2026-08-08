'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPasscode } from '@/app/gallery/actions';
import { Shoot } from '@/lib/shoots';
import { Lock, ArrowRight, Download, Loader2, Info } from 'lucide-react';
import Image from 'next/image';

export default function GalleryClient() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shoot, setShoot] = useState<Shoot | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await verifyPasscode(passcode.trim());
      if (result.success && result.shoot) {
        setShoot(result.shoot);
      } else {
        setError(result.error || 'Invalid passcode');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shoot) return;
    // Trigger download API route
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
            className="w-full max-w-md flex flex-col items-center text-center space-y-8"
          >
            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-foreground/70" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-serif tracking-tight">Client Access</h1>
              <p className="text-foreground/60 text-sm">
                Enter your unique passcode to view and download your gallery.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full bg-transparent border-b border-foreground/20 px-4 py-3 outline-none focus:border-foreground transition-colors placeholder:text-foreground/30 text-center text-lg"
                  disabled={loading}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || !passcode.trim()}
                className="w-full py-4 mt-8 flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] font-mono group disabled:opacity-50 transition-all border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Access Gallery
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
              
              <button
                onClick={handleDownload}
                className="flex items-center gap-3 px-6 py-3 bg-foreground text-background font-mono text-xs uppercase tracking-widest hover:bg-foreground/80 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
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
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
