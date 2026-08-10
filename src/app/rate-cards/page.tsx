import type { Metadata } from 'next';
import RateCardsClient from '@/components/rate-cards-client';

export const metadata: Metadata = {
  title: 'Rate Cards | bynk',
  description: 'Services, packages, and pricing for photography shoots.',
};

export default function RateCardsPage() {
  return (
    <main className="h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden select-none">
      {/* Dynamic grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03] mix-blend-difference bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')]" />

      <RateCardsClient />
    </main>
  );
}
