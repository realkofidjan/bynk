'use server';

import { getShootByPasscodeAsync } from '@/lib/shoots';
import { createServerSupabase } from '@/lib/supabase';

export async function verifyPasscode(passcode: string) {
  // Simulate slight delay to prevent timing attacks / brute force slightly
  await new Promise((resolve) => setTimeout(resolve, 400));

  const trimmed = passcode.trim();
  const shoot = await getShootByPasscodeAsync(trimmed);

  if (shoot) {
    return { success: true, shoot };
  }

  // Check if this passcode belonged to a gallery that has now expired
  try {
    const supabase = createServerSupabase();
    const { data: expired } = await supabase
      .from('client_galleries')
      .select('client_info')
      .eq('passcode', trimmed)
      .eq('status', 'expired')
      .maybeSingle();

    if (expired) {
      return { success: false, error: 'This gallery has expired and photos have been removed.' };
    }
  } catch {}

  return { success: false, error: 'Invalid passcode' };
}
