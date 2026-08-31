import GalleryClient from '@/components/gallery-client';

export const metadata = {
  title: 'Client Gallery | bynk',
  description: 'Access your private client gallery.',
};

export default function GalleryPage() {
  return (
    <main className="fixed inset-0 z-10 overflow-y-auto bg-background text-foreground flex flex-col items-center pt-24 pb-20 px-4 sm:px-8 lg:px-12 font-sans overscroll-contain">
      <GalleryClient />
    </main>
  );
}
