import GalleryClient from '@/components/gallery-client';

export const metadata = {
  title: 'Client Gallery | bynk',
  description: 'Access your private client gallery.',
};

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center pt-24 pb-16 px-4 sm:px-8 lg:px-12 relative overflow-y-auto font-sans">
      <GalleryClient />
    </main>
  );
}
