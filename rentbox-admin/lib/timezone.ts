import { format, formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export const DEFAULT_TIMEZONE = 'Europe/Tallinn';

/**
 * Convert UTC date to local timezone
 */
export function utcToLocal(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(utcDate, timezone);
}

/**
 * Convert local timezone date to UTC
 */
export function localToUtc(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const localDate = typeof date === 'string' ? parseISO(date) : date;
  return fromZonedTime(localDate, timezone);
}

/**
 * Format date in local timezone
 */
export function formatLocal(
  date: Date | string,
  formatString: string = 'yyyy-MM-dd HH:mm',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const utcDate = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(utcDate, timezone, formatString);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatLocal(date, 'dd.MM.yyyy HH:mm', timezone);
}

/**
 * Format date only
 */
export function formatDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatLocal(date, 'dd.MM.yyyy', timezone);
}

/**
 * Format time only
 */
export function formatTime(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatLocal(date, 'HH:mm', timezone);
}

/**
 * Get datetime-local input format (for forms)
 */
export function toDateTimeLocal(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatLocal(date, "yyyy-MM-dd'T'HH:mm", timezone);
}

/**
 * Parse datetime-local input
 */
export function fromDateTimeLocal(dateString: string, timezone: string = DEFAULT_TIMEZONE): Date {
  return localToUtc(dateString, timezone);
}
