/* ────────────────────────────────────────
   Booking Types & Constants
   ──────────────────────────────────────── */

export type TimeSlot = 'morning' | 'afternoon' | 'full_day';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type Booking = {
  id: string;
  date: string; // ISO date string e.g. "2026-09-15"
  slot: TimeSlot;
  category: string;
  tier: string;
  name: string;
  email: string;
  phone: string;
  add_ons: string[]; // array of add-on IDs
  total_price: number;
  deposit_amount?: number;
  paystack_reference?: string;
  status: BookingStatus;
  full_day: boolean;
  created_at: string;
};

export type SlotAvailability = 'available' | 'booked';

export type DayAvailability = {
  blocked: boolean;
  reason?: 'full_day_booking' | 'all_slots_taken' | 'sunday';
  slots: Record<'morning' | 'afternoon', SlotAvailability>;
};

export type AvailabilityMap = Record<string, DayAvailability>;

/* ── Constants ── */

/** Categories where the shoot takes the entire day (both slots consumed) */
export const FULL_DAY_CATEGORIES = ['weddings', 'events'] as const;

/** Maximum booking slots per day (morning + afternoon) */
export const MAX_SLOTS_PER_DAY = 2;

/** Human-readable slot labels */
export const SLOT_LABELS: Record<'morning' | 'afternoon', string> = {
  morning: 'Morning (8 AM – 12 PM)',
  afternoon: 'Afternoon (12 PM – 4 PM)',
};

/** Check if a category consumes the full day */
export function isFullDayCategory(categoryId: string): boolean {
  return (FULL_DAY_CATEGORIES as readonly string[]).includes(categoryId);
}

/** Format a date to ISO date string (YYYY-MM-DD) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
