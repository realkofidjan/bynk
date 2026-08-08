'use server';

import { getShootByPasscode } from '@/lib/shoots';

export async function verifyPasscode(passcode: string) {
  // Simulate slight delay to prevent timing attacks / brute force slightly
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const shoot = getShootByPasscode(passcode);
  
  if (shoot) {
    return { success: true, shoot };
  }
  
  return { success: false, error: 'Invalid passcode' };
}
