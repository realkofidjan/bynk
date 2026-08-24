import {
  Booking,
  formatTimeLabel,
  getBookingStartTime,
  getBookingEndTime,
  calculateBookingFinancials,
} from '@/lib/booking-types';

/**
 * Format a date string "YYYY-MM-DD" and time "HH:MM" into iCal UTC / Local string "YYYYMMDDTHHMMSS"
 */
export function formatIcsDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-');
  let hh = '09';
  let mm = '00';

  if (timeStr && timeStr.includes(':')) {
    const [h, min] = timeStr.split(':');
    hh = h.padStart(2, '0');
    mm = min.padStart(2, '0');
  }

  return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}T${hh}${mm}00`;
}

/**
 * Generate iCalendar (RFC 5545) .ics string for one or multiple bookings
 */
export function createIcsContent(bookings: Booking[], isClientView: boolean = false): string {
  const events = bookings.map((b) => {
    const isFullDay = b.full_day || b.slot === 'full_day';
    const startTime = getBookingStartTime(b);
    const endTime = getBookingEndTime(b);

    const startFormatted = formatIcsDateTime(b.date, isFullDay ? '09:00' : startTime);
    const endFormatted = formatIcsDateTime(b.date, isFullDay ? '17:00' : endTime);

    const title = isClientView
      ? `BYNK Photography Shoot — ${b.category} (${b.tier})`
      : `BYNK Shoot: ${b.name} — ${b.category} (${b.tier})`;

    const { depositPaid, remainingBalance } = calculateBookingFinancials({
      total_price: b.total_price || 0,
      add_ons: b.add_ons || [],
    });

    const descriptionLines = [
      `BYNK Photography Session`,
      `Client Name: ${b.name}`,
      `Category: ${b.category}`,
      `Package: ${b.tier}`,
      `Time Slot: ${isFullDay ? 'Full Day' : `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`}`,
      `Total Price: GHS ${b.total_price.toLocaleString()}`,
      `Deposit Paid: GHS ${depositPaid.toLocaleString()}`,
      `Remaining Balance: GHS ${remainingBalance.toLocaleString()}`,
      `Phone: ${b.phone}`,
      `Email: ${b.email}`,
    ];

    const description = descriptionLines.join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:${b.id}@bynkphotography.com`,
      `DTSTAMP:${formatIcsDateTime(new Date().toISOString().split('T')[0], '00:00')}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:Accra, Ghana`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BYNK Photography//NONGNS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BYNK Shoots Schedule',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate Google Calendar event URL pre-populated with details
 */
export function createGoogleCalendarUrl(booking: Booking, isClientView: boolean = false): string {
  const isFullDay = booking.full_day || booking.slot === 'full_day';
  const startTime = getBookingStartTime(booking);
  const endTime = getBookingEndTime(booking);

  const startIso = formatIcsDateTime(booking.date, isFullDay ? '09:00' : startTime);
  const endIso = formatIcsDateTime(booking.date, isFullDay ? '17:00' : endTime);

  const title = isClientView
    ? `BYNK Photography Shoot — ${booking.category} (${booking.tier})`
    : `BYNK Shoot: ${booking.name} — ${booking.category} (${booking.tier})`;

  const { depositPaid, remainingBalance } = calculateBookingFinancials({
    total_price: booking.total_price || 0,
    add_ons: booking.add_ons || [],
  });

  const details = [
    `BYNK Photography Session`,
    `Client: ${booking.name}`,
    `Package: ${booking.category} (${booking.tier})`,
    `Time: ${isFullDay ? 'Full Day' : `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`}`,
    `Deposit Paid: GHS ${depositPaid.toLocaleString()}`,
    `Remaining Balance: GHS ${remainingBalance.toLocaleString()}`,
    `Contact Phone: ${booking.phone}`,
  ].join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startIso}/${endIso}`,
    details: details,
    location: 'Accra, Ghana',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Trigger client-side download of a .ics calendar file
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
