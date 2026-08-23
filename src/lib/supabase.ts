import { createClient } from '@supabase/supabase-js';

/* ── Server-side client (used in API routes) ── */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/* ── Client-side client (used in browser) ── */
let clientInstance: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabase() {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  clientInstance = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  return clientInstance;
}
