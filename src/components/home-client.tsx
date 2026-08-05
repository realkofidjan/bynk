'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '@/lib/projects';

// ─── Thumbnail Item with Shimmer Loader ─────────────────────────────────────

function ThumbnailItem({
  img,
  isSelected,
  onClick,
}: {
  img: { src: string; alt?: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const [thumbLoaded, setThumbLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex-none w-20 sm:w-24 md:w-28 overflow-hidden rounded-none transition-all duration-300 ${
        isSelected
          ? 'opacity-100 scale-[1.02]'
          : 'opacity-30 hover:opacity-70'
      }`}
    >
      <div className="aspect-[3/2] relative overflow-hidden bg-foreground/[0.04] rounded-none">
        {!thumbLoaded && <div className="absolute inset-0 shimmer rounded-none" />}
        <img
          src={img.src}
          alt={img.alt || 'Thumbnail'}
          loading="lazy"
          onLoad={() => setThumbLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover rounded-none transition-opacity duration-300 ${
            thumbLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </button>
  );
}

// ─── Lightbox Component ──────────────────────────────────────────────────────

export function Lightbox({
  project,
  projectIndex,
  onClose,
}: {
  project: Project;
  projectIndex: number;
  onClose: () => void;
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const [mainLoaded, setMainLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  // Thumbnail strip scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Pre-cache all project images into browser HTTP cache upon opening
  useEffect(() => {
    if (!project || !project.images) return;
    project.images.forEach((img) => {
      const preloader = new Image();
      preloader.src = img.src;
    });
  }, [project]);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check scroll bounds
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Ensure thumbnails start from the beginning on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    requestAnimationFrame(checkScroll);
  }, [checkScroll]);

  const handleScrollLeft = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstThumb = el.firstElementChild?.firstElementChild as HTMLElement;
    const step = (firstThumb?.offsetWidth || 112) + 12;
    el.scrollBy({ left: -step, behavior: 'smooth' });
  }, []);

  const handleScrollRight = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstThumb = el.firstElementChild?.firstElementChild as HTMLElement;
    const step = (firstThumb?.offsetWidth || 112) + 12;
    el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 400);
  }, [onClose]);

  const images = project.images;

  const handleSelectImage = useCallback((index: number) => {
    setMainLoaded(false);
    setMainIndex(index);

    const el = scrollRef.current;
    if (!el) return;
    const firstThumb = el.firstElementChild?.firstElementChild as HTMLElement;
    const thumbW = firstThumb?.offsetWidth || 112;
    const step = thumbW + 12;

    const viewLeft = el.scrollLeft;
    const viewRight = el.scrollLeft + el.clientWidth;

    const thumbLeft = index * step;
    const thumbRight = thumbLeft + thumbW;

    // If clicking edge image on the right side and there is an image beside it, shift scroll to make next visible
    if (index + 1 < images.length && thumbRight >= viewRight - 20) {
      const targetScroll = (index + 2) * step - el.clientWidth;
      el.scrollTo({ left: Math.max(targetScroll, el.scrollLeft + step), behavior: 'smooth' });
    }
    // If clicking edge image on the left side and there is an image beside it, shift scroll to make prev visible
    else if (index - 1 >= 0 && thumbLeft <= viewLeft + 20) {
      const targetScroll = (index - 1) * step;
      el.scrollTo({ left: Math.min(targetScroll, el.scrollLeft - step), behavior: 'smooth' });
    }
    // Standard scroll into view
    else if (thumbLeft < viewLeft) {
      el.scrollTo({ left: thumbLeft, behavior: 'smooth' });
    } else if (thumbRight > viewRight) {
      el.scrollTo({ left: thumbRight - el.clientWidth, behavior: 'smooth' });
    }
  }, [images.length]);

  return (
    <div
      id="lightbox-overlay"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 transition-all duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-background/95 backdrop-blur-xl transition-all duration-400 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Content Container with fixed height flex structure */}
      <div
        className={`relative z-10 flex flex-col w-full max-w-5xl h-[85vh] max-h-[850px] transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: title + close (Fixed top section) */}
        <div className="flex-none w-full flex items-baseline justify-between mb-12">
          <div>
            <h2 className="font-serif text-xl md:text-2xl text-foreground/90 italic tracking-tight">
              {project.title}
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/30 mt-1">
              {project.category} · Project {String(projectIndex + 1).padStart(2, '0')}
            </p>
          </div>
          <button
            id="lightbox-close"
            onClick={handleClose}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/40
              hover:text-foreground/90 transition-colors duration-300 py-1 ml-6 flex-none"
          >
            Close
          </button>
        </div>

        {/* Main image container with Shimmer loader */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center py-6 my-2 relative">
          {!mainLoaded && (
            <div className="w-[82%] h-[78%] aspect-[3/2] shimmer rounded-none" />
          )}
          <img
            key={mainIndex}
            src={images[mainIndex].src}
            alt={images[mainIndex].alt}
            className={`max-w-[82%] max-h-[78%] w-auto h-auto object-contain rounded-none image-blink transition-opacity duration-300 ${
              mainLoaded ? 'opacity-100' : 'opacity-0 absolute'
            }`}
            onLoad={() => setMainLoaded(true)}
          />
        </div>

        {/* Thumbnail strip */}
        <div className="flex-none w-full flex items-center justify-center gap-2 md:gap-4 pt-4">
          {/* Left Arrow Button */}
          <button
            id="thumb-arrow-left"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll thumbnails left"
            className={`flex-none p-2 transition-all duration-300 ${
              canScrollLeft
                ? 'text-foreground/70 hover:text-foreground opacity-100 cursor-pointer'
                : 'text-foreground/20 opacity-30 cursor-default'
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M19 12H5M12 5L5 12L12 19" />
            </svg>
          </button>

          {/* Scrollable thumbnail viewport */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="max-w-[75vw] md:max-w-2xl overflow-x-auto scrollbar-hide flex justify-start"
          >
            <div className="flex gap-3 justify-start items-center" style={{ width: 'max-content' }}>
              {images.map((img, i) => (
                <ThumbnailItem
                  key={i}
                  img={img}
                  isSelected={i === mainIndex}
                  onClick={() => handleSelectImage(i)}
                />
              ))}
            </div>
          </div>

          {/* Right Arrow Button */}
          <button
            id="thumb-arrow-right"
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll thumbnails right"
            className={`flex-none p-2 transition-all duration-300 ${
              canScrollRight
                ? 'text-foreground/70 hover:text-foreground opacity-100 cursor-pointer'
                : 'text-foreground/20 opacity-30 cursor-default'
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M5 12H19M12 5L19 12L12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Client Component ──────────────────────────────────────────────────

export default function HomeClient({ projects: _projects }: { projects: Project[] }) {
  return (
    <main id="home-page" className="relative h-screen w-full overflow-hidden">
      {/* Bottom-right hint */}
      <div className="absolute bottom-8 right-8 text-right font-mono uppercase text-[10px] tracking-[0.15em] text-foreground/30">
        <p>Scroll · Arrow keys · Touch</p>
      </div>
    </main>
  );
}
