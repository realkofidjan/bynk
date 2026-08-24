import GalleryClient from '@/components/gallery-client';

export const metadata = {
  title: 'Client Gallery | bynk',
  description: 'Access your private client gallery.',
};

export default function GalleryPage() {
  return (
    <main className="h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 sm:p-24 relative overflow-hidden">
      <GalleryClient />
    </main>
  );
}
