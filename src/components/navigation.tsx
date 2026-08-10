'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Rate Cards', href: '/rate-cards' },
  { label: 'Me', href: '/me' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Left Navigation Links */}
      <nav
        id="main-navigation"
        className="fixed top-8 left-8 z-50 pointer-events-auto flex flex-row items-center gap-6"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              className={`
                group relative font-mono text-[11px] uppercase tracking-[0.2em] 
                transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                py-1
                ${
                  isActive
                    ? 'text-foreground opacity-100'
                    : 'text-foreground/40 opacity-70 hover:text-foreground/80 hover:opacity-100'
                }
              `}
            >
              <span className="relative">
                {item.label}
                <span
                  className={`
                    absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    ${isActive ? 'w-full opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60'}
                  `}
                />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Top Right Hero Tagline — Global across all pages */}
      <div className="fixed top-8 right-8 z-40 pointer-events-none text-right">
        <h1
          id="hero-heading"
          className="font-serif text-xs sm:text-sm md:text-base lg:text-lg tracking-tight text-foreground leading-none whitespace-nowrap"
        >
          <span className="italic font-light">I create;</span>{' '}
          <span className="font-normal">therefore I am</span>
        </h1>
      </div>
    </>
  );
}
