'use server';

import { getShootByPasscodeAsync } from '@/lib/shoots';

export async function verifyPasscode(passcode: string) {
  // Simulate slight delay to prevent timing attacks / brute force slightly
  await new Promise((resolve) => setTimeout(resolve, 400));

  const shoot = await getShootByPasscodeAsync(passcode.trim());

  if (shoot) {
    return { success: true, shoot };
  }

  return { success: false, error: 'Invalid passcode' };
}
