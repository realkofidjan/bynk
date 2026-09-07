'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Camera,
  Upload,
  Calendar,
  LogOut,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const adminNavItems = [
  { label: 'Shoots', href: '/admin/shoots', icon: Camera, description: 'Manage bookings & orders' },
  { label: 'Upload', href: '/admin/upload', icon: Upload, description: 'Gallery management' },
  { label: 'Schedule', href: '/admin/schedule', icon: Calendar, description: 'Calendar & sync' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't wrap the login page with admin layout
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    document.cookie = 'bynk_admin=; path=/; max-age=0';
    router.push('/admin');
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-foreground/10 bg-background shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-foreground/[0.06]">
          <Link href="/" className="group flex items-center gap-2">
            <ChevronLeft className="w-3 h-3 text-foreground/30 group-hover:text-foreground/60 transition-colors" />
            <span className="text-foreground/40 text-[9px] font-mono uppercase tracking-[0.3em] group-hover:text-foreground/60 transition-colors">
              Back to Site
            </span>
          </Link>
          <h2 className="mt-3 text-sm font-serif tracking-tight text-foreground">
            BYNK Admin
          </h2>
          <p className="text-foreground/30 text-[9px] font-mono uppercase tracking-[0.2em] mt-0.5">
            Dashboard
          </p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-none transition-all duration-200
                  ${
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]'
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-background/80' : 'text-foreground/40'}`} />
                <div className="min-w-0">
                  <span className={`block text-[11px] font-mono uppercase tracking-[0.15em] font-medium ${isActive ? 'text-background' : ''}`}>
                    {item.label}
                  </span>
                  <span className={`block text-[8px] font-mono tracking-wider mt-0.5 ${isActive ? 'text-background/60' : 'text-foreground/25'}`}>
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-foreground/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-foreground/30 hover:text-red-400 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header + Menu */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-foreground/10 bg-background/95 backdrop-blur-md shrink-0 z-50">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-foreground/30 hover:text-foreground/60 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <h2 className="text-xs font-serif tracking-tight text-foreground">BYNK Admin</h2>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-[49px] left-0 right-0 z-40 bg-background border-b border-foreground/10 shadow-lg"
          >
            <nav className="p-3 space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 transition-all
                      ${isActive ? 'bg-foreground text-background' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-background/80' : 'text-foreground/40'}`} />
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em] font-medium">
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-foreground/30 hover:text-red-400 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
