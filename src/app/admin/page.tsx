'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, LogIn } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function AdminLoginForm() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get('redirect') || '/upload';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.replace(redirectTo);
      } else {
        setError(data.error || 'Invalid password');
        setPassword('');
      }
    } catch {
      setError('Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center text-center space-y-8 max-w-sm w-full"
    >
      {/* Icon & Heading */}
      <div className="space-y-3 flex flex-col items-center">
        <div className="p-3 bg-foreground/5 border border-foreground/15 rounded-full">
          <Lock className="w-6 h-6 text-foreground/70" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground">
          Admin Access
        </h1>
        <p className="text-foreground/50 text-xs font-mono uppercase tracking-[0.2em]">
          Enter admin password to continue
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={loading}
          autoFocus
          className="w-full px-4 py-3 bg-foreground/[0.03] border border-foreground/15 text-foreground text-sm font-mono tracking-wide placeholder:text-foreground/30 focus:outline-none focus:border-foreground/40 transition-colors"
        />

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-foreground text-background font-mono text-xs uppercase tracking-wider font-semibold hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs font-mono tracking-wide"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="fixed inset-0 z-30 bg-background text-foreground flex flex-col items-center justify-center px-4 font-sans">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-foreground/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest">Loading...</span>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
