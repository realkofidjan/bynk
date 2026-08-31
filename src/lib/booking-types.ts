/* ────────────────────────────────────────
   Booking Types & Constants
   ──────────────────────────────────────── */

export type TimeSlot = string; // e.g. '09:00', '11:30', 'full_day', 'morning', 'afternoon'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

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
  start_time?: string; // e.g. "09:00"
  end_time?: string; // e.g. "10:30"
  created_at: string;
};

export type SlotAvailability = 'available' | 'booked';

export type DayAvailability = {
  blocked: boolean;
  reason?: 'full_day_booking' | 'max_shoots_reached' | 'category_limit_reached' | 'no_slots_available' | 'sunday';
  slots?: Record<string, SlotAvailability>;
};

export type AvailabilityMap = Record<string, DayAvailability>;

/* ── Category & Package Rules ── */

export type CategoryGroup = 'portraits' | 'events' | 'realestate' | 'weddings';

/** Maximum booking shoots per day */
export const MAX_SHOOTS_PER_DAY = 4;

/** Work day start and end time in minutes from midnight */
export const WORK_DAY_START_MINS = 9 * 60; // 09:00 AM
export const WORK_DAY_END_MINS = 19 * 60; // 07:00 PM

/** Categories where shoots take the entire day */
export const FULL_DAY_CATEGORIES = ['weddings'] as const;

/** Human-readable default slot labels (for backward compatibility) */
export const SLOT_LABELS: Record<string, string> = {
  morning: 'Morning (9 AM – 12 PM)',
  afternoon: 'Afternoon (1 PM – 4 PM)',
  full_day: 'Full Day Session',
};

export const ADDON_NAME_MAP: Record<string, string> = {
  outfit: 'Additional Outfit',
  retouched: 'Additional Retouched Image',
  edited: 'Additional Edited Image',
  'studio-hour': 'Additional Studio Hour',
  person: 'Additional Person',
  concept: 'Concept & Creative Direction',
  makeup: 'Makeup Artist',
  hour: 'Additional Coverage Hour',
  location: 'Additional Location',
  photographer: 'Second Photographer',
  prewedding: 'Pre-Wedding Session',
  engagement: 'Engagement Ceremony Coverage',
  shower: 'Bridal Shower Coverage',
  album: 'Premium Wedding Album',
  print: 'Framed Print',
  rush: 'Rush Delivery',
  'same-day': 'Same-Day Preview',
  highlights: 'Event Highlights Reel',
  drone: 'Aerial Photography / Drone',
  dusk: 'Twilight / Dusk Shoot',
  staging: 'Virtual Staging',
};

export const ADDON_PRICES: Record<string, number> = {
  outfit: 150,
  retouched: 50,
  edited: 30,
  'studio-hour': 350,
  person: 100,
  concept: 300,
  makeup: 500,
  hour: 300,
  location: 200,
  photographer: 700,
  prewedding: 1000,
  engagement: 1500,
  shower: 1200,
  album: 1500,
  print: 500,
  rush: 500,
  'same-day': 400,
  highlights: 800,
  drone: 1200,
  dusk: 500,
  staging: 800,
};

/** Format add-on ID or string to clean human readable display title */
export function formatAddOnName(str: string): string {
  if (!str) return '';
  return ADDON_NAME_MAP[str.toLowerCase()] || str;
}

/** Calculate exact deposit paid (50% base + 100% add-ons) and remaining balance */
export function calculateBookingFinancials(b: {
  total_price: number;
  add_ons?: string[];
}) {
  const addOns = b.add_ons || [];
  let addOnsTotal = 0;

  for (const item of addOns) {
    const key = item.toLowerCase();
    let found = false;
    for (const [addonId, price] of Object.entries(ADDON_PRICES)) {
      if (key === addonId || key.includes(addonId)) {
        addOnsTotal += price;
        found = true;
        break;
      }
    }
    if (!found) {
      for (const [addonId, name] of Object.entries(ADDON_NAME_MAP)) {
        if (name.toLowerCase() === key || key.includes(name.toLowerCase())) {
          addOnsTotal += ADDON_PRICES[addonId] || 0;
          break;
        }
      }
    }
  }

  // Ensure addOnsTotal does not exceed total_price
  addOnsTotal = Math.min(addOnsTotal, b.total_price || 0);

  const basePrice = Math.max(0, (b.total_price || 0) - addOnsTotal);
  const depositPaid = Math.round(basePrice / 2) + addOnsTotal;
  const remainingBalance = Math.max(0, (b.total_price || 0) - depositPaid);

  return {
    basePrice,
    addOnsTotal,
    depositPaid,
    remainingBalance,
  };
}

/** Map category ID or Label to main Category Group for the 2-out-of-3 combination rule */
export function getCategoryGroup(categoryId: string): CategoryGroup {
  const c = (categoryId || '').toLowerCase();
  if (c.includes('portrait')) return 'portraits';
  if (c.includes('event')) return 'events';
  if (c.includes('estate') || c.includes('real')) return 'realestate';
  if (c.includes('wedding')) return 'weddings';
  return 'portraits';
}

/** Check if a category and tier combination is a full day booking */
export function isFullDayCategory(categoryId: string, tierName?: string): boolean {
  const c = (categoryId || '').toLowerCase();
  const t = (tierName || '').toLowerCase();
  if (c.includes('wedding')) return true;
  if (c.includes('event') && t.includes('platinum')) return true;
  return false;
}

/** Package duration mapping in minutes */
export function getTierDurationMinutes(categoryId: string, tierName: string): number {
  const c = (categoryId || '').toLowerCase();
  const t = (tierName || '').toLowerCase();

  if (c.includes('wedding')) return 480; // Full Day (8 hrs)

  if (c.includes('event')) {
    if (t.includes('signature')) return 240; // 4 hrs (Half Day)
    if (t.includes('lux')) return 360; // 6 hrs (Half Day / Extended)
    if (t.includes('platinum')) return 480; // 8 hrs (Full Day)
    return 240;
  }

  if (c.includes('estate') || c.includes('real')) {
    if (t.includes('signature')) return 90; // 1.5 hrs
    if (t.includes('lux')) return 150; // 2.5 hrs
    if (t.includes('platinum')) return 240; // 4 hrs
    return 90;
  }

  // Location Portraits
  if (c.includes('location')) {
    if (t.includes('signature')) return 60; // 1.0 hr
    if (t.includes('lux')) return 90; // 1.5 hrs
    if (t.includes('platinum')) return 150; // 2.5 hrs
    return 60;
  }

  // Studio Portraits (studio rental requires full hourly blocks)
  if (t.includes('signature')) return 60; // 1.0 hr
  if (t.includes('lux')) return 120; // 2.0 hrs
  if (t.includes('platinum')) return 180; // 3.0 hrs

  return 60;
}

/** Convert time string "HH:MM" to minutes from midnight */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return WORK_DAY_START_MINS;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes from midnight to "HH:MM" string */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format time (either "HH:MM" or minutes) to human readable string e.g. "9:00 AM" */
export function formatTimeLabel(input: string | number): string {
  if (typeof input === 'string') {
    if (SLOT_LABELS[input]) return SLOT_LABELS[input];
    if (!input.includes(':')) return input;
  }
  const mins = typeof input === 'number' ? input : timeToMinutes(input);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? '00' : String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

/** Format a date to ISO date string (YYYY-MM-DD) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type AvailableSlot = {
  timeStr: string; // "09:00"
  label: string; // "9:00 AM"
  endTimeStr: string; // "10:30"
  endLabel: string; // "10:30 AM"
  durationMinutes: number;
};

/** Get clean tier name without embedded time slot or completion tag */
export function getCleanTierName(tierStr: string): string {
  if (!tierStr) return '';
  return tierStr.split(' @ ')[0].replace(/\[Completed.*?\]/g, '').trim();
}

/** Convert candidate slot time string ("09:30", "14:00", etc.) to valid DB constraint slot ('morning' | 'afternoon' | 'full_day') */
export function getDbSlotValue(slotStr: string): 'morning' | 'afternoon' | 'full_day' {
  if (slotStr === 'full_day') return 'full_day';
  if (slotStr === 'morning') return 'morning';
  if (slotStr === 'afternoon') return 'afternoon';
  if (slotStr.includes(':')) {
    const [h] = slotStr.split(':').map(Number);
    return h < 12 ? 'morning' : 'afternoon';
  }
  return 'morning';
}

/** Get booking start time string ("09:00", "14:00", etc.) safely from booking record */
export function getBookingStartTime(b: Booking): string {
  if (b.start_time) return b.start_time;

  // Check if slot has HH:MM format
  if (b.slot && b.slot.includes(':')) {
    const match = b.slot.match(/\b\d{1,2}:\d{2}\b/);
    if (match) return match[0].padStart(5, '0');
  }

  // Check if tier has @ HH:MM format (e.g. "Signature @ 09:30")
  if (b.tier && b.tier.includes('@')) {
    const timePart = b.tier.split('@')[1]?.trim();
    if (timePart && timePart.includes(':')) {
      const match = timePart.match(/\b\d{1,2}:\d{2}\b/);
      if (match) return match[0].padStart(5, '0');
    }
  }

  if (b.slot === 'morning') return '09:00';
  if (b.slot === 'afternoon') return '14:00';
  if (b.slot === 'full_day') return '09:00';
  return '09:00';
}

/** Get booking end time string ("10:30", "17:00", etc.) safely from booking record */
export function getBookingEndTime(b: Booking): string {
  if (b.end_time) return b.end_time;
  if (b.full_day || b.slot === 'full_day') return '17:00';
  const startStr = getBookingStartTime(b);
  const startMins = timeToMinutes(startStr);
  const durationMins = getTierDurationMinutes(b.category, getCleanTierName(b.tier));
  return minutesToTime(startMins + durationMins);
}

/** Calculate available starting time slots for a specific package on a given date */
export function calculateAvailableTimeSlots(
  dateBookings: Booking[],
  categoryId: string,
  tierName: string
): AvailableSlot[] {
  // If target is full day
  const isTargetFullDay = isFullDayCategory(categoryId, tierName);

  if (isTargetFullDay) {
    // Requires date to have zero existing bookings
    if (dateBookings.length === 0) {
      return [
        {
          timeStr: 'full_day',
          label: 'Full Day Session (Starts 9:00 AM)',
          endTimeStr: '17:00',
          endLabel: '5:00 PM',
          durationMinutes: 480,
        },
      ];
    }
    return [];
  }

  // Check if any existing booking is a full day
  const hasFullDayBooking = dateBookings.some(
    (b) => b.full_day || b.slot === 'full_day' || isFullDayCategory(b.category, b.tier)
  );
  if (hasFullDayBooking) return [];

  // Check daily 4 shoots cap
  if (dateBookings.length >= MAX_SHOOTS_PER_DAY) return [];

  // Check 2-out-of-3 category rule
  const targetGroup = getCategoryGroup(categoryId);
  const existingGroups = new Set(
    dateBookings.map((b) => getCategoryGroup(b.category)).filter((g) => g !== 'weddings')
  );
  const combinedGroups = new Set([...Array.from(existingGroups), targetGroup]);

  // If combined category groups exceed 2, this shoot cannot be placed on this day
  if (combinedGroups.size > 2) return [];

  // Buffer: 1.0 hour (60 min) if single category group, 1.5 hours (90 min) if mixed category groups
  const bufferMinutes = combinedGroups.size > 1 ? 90 : 60;
  const duration = getTierDurationMinutes(categoryId, tierName);

  // Compute intervals of existing bookings
  const bookedIntervals = dateBookings.map((b) => {
    const startMins = timeToMinutes(getBookingStartTime(b));
    const endMins = timeToMinutes(getBookingEndTime(b));
    return { start: startMins, end: endMins };
  });

  const validSlots: AvailableSlot[] = [];

  // Generate candidate start times starting at 9:00 AM in 30-min increments
  for (let candStart = WORK_DAY_START_MINS; candStart <= WORK_DAY_END_MINS - duration; candStart += 30) {
    const candEnd = candStart + duration;

    // Must finish by work day end (19:00 / 7:00 PM)
    if (candEnd > WORK_DAY_END_MINS) continue;

    // Check collision & buffer against every existing booking
    let isValid = true;
    for (const booked of bookedIntervals) {
      // Overlap check with buffer:
      // If candidate is before existing shoot: candidate end + buffer must be <= existing start
      // If candidate is after existing shoot: candidate start must be >= existing end + buffer
      if (candStart < booked.end && candEnd > booked.start) {
        isValid = false;
        break;
      }
      if (candEnd <= booked.start) {
        if (candEnd + bufferMinutes > booked.start) {
          isValid = false;
          break;
        }
      }
      if (candStart >= booked.end) {
        if (candStart < booked.end + bufferMinutes) {
          isValid = false;
          break;
        }
      }
    }

    if (isValid) {
      const timeStr = minutesToTime(candStart);
      const endTimeStr = minutesToTime(candEnd);
      validSlots.push({
        timeStr,
        label: formatTimeLabel(candStart),
        endTimeStr,
        endLabel: formatTimeLabel(candEnd),
        durationMinutes: duration,
      });
    }
  }

  return validSlots;
}

