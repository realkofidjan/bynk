import GalleryClient from '@/components/gallery-client';

export const metadata = {
  title: 'Client Gallery | bynk',
  description: 'Access your private client gallery.',
};

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 sm:p-24 relative overflow-hidden">
      {/* Dynamic grain overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03] mix-blend-difference bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')]" />

      <GalleryClient />
    </main>
  );
}
