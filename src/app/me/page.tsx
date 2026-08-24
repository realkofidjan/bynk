'use client';

import TeamMemberCard from '@/components/ui/team-member-card';

const socials = [
  {
    name: 'Instagram',
    handle: '@by.justnk',
    href: 'https://instagram.com/by.justnk',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-8 sm:h-8">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: 'Threads',
    handle: '@by.justnk',
    href: 'https://threads.net/@by.justnk',
    icon: (
      <svg width="32" height="32" viewBox="0 0 192 192" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8">
        <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    handle: '0205555084',
    href: 'https://wa.me/233205555084',
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none" className="w-7 h-7 sm:w-8 sm:h-8">
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M23.993 0C10.762 0 0 10.765 0 24c0 5.248 1.693 10.116 4.57 14.067L1.58 46.984l9.225-2.948C14.599 46.547 19.126 48 24.007 48 37.238 48 48 37.234 48 24 48 10.766 37.238 0 24.007 0h-.014zM17.293 12.19c-.465-1.114-.818-1.156-1.523-1.185a12.87 12.87 0 0 0-.804-.027c-.917 0-1.876.268-2.455.86-.705.72-2.454 2.399-2.454 5.842 0 3.443 2.51 6.773 2.849 7.239.353.465 4.895 7.633 11.947 10.554 5.515 2.286 7.152 2.074 8.407 1.806 1.834-.395 4.133-1.75 4.711-3.386.578-1.637.578-3.034.409-3.33-.169-.297-.635-.466-1.34-.819-.705-.353-4.133-2.046-4.782-2.272-.635-.24-1.241-.155-1.72.522-.677.945-1.34 1.905-1.876 2.483-.423.452-1.115.508-1.693.268-.776-.324-2.948-1.087-5.628-3.471-2.074-1.848-3.484-4.148-3.893-4.839-.41-.705-.043-1.115.28-1.496.353-.437.691-.747 1.044-1.156.353-.409.55-.621.776-1.101.24-.465.07-.945-.1-1.298-.169-.353-1.58-3.796-2.158-5.192z" />
      </svg>
    ),
  },
];

export default function MePage() {
  return (
    <main id="me-page" className="min-h-screen lg:h-screen bg-background relative flex flex-col lg:flex-row items-center lg:items-end justify-center lg:justify-start overflow-hidden selection:bg-foreground/20 pt-24 pb-4 px-4 lg:pt-28 lg:pb-8 lg:px-12 xl:px-16">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-foreground/[0.02] via-transparent to-transparent" />

      {/* Editorial Team Member Card Component - Touch Bottom-Left & Fill 80% */}
      <div className="relative z-10 pointer-events-auto w-full max-w-full lg:w-[85vw] lg:max-w-[85vw] pb-2">
        <TeamMemberCard
          position="left"
          firstName="Nana Kofi"
          lastName="Djan"
          imageUrl="/profile/profile.png"
          description={`Light. People. Stories.
Portraits • Street • Lifestyle • Events`}
        />
      </div>

      {/* Vertical Social Media Icon Bar on Desktop / Horizontal on Mobile */}
      <div className="relative lg:fixed right-auto lg:right-8 top-auto lg:top-1/2 lg:-translate-y-1/2 z-40 w-full lg:w-auto flex flex-row lg:flex-col items-center justify-center gap-6 sm:gap-8 pointer-events-auto mt-4 lg:mt-0 pb-4 lg:pb-0">
        {socials.map((item) => (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.name}
            className="group p-2 text-foreground/50 hover:text-foreground transition-all duration-300 transform hover:scale-125"
          >
            <div className="transition-colors text-foreground/60 group-hover:text-foreground">
              {item.icon}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
