import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { parseISO, isValid } from "date-fns";

export const DEFAULT_TIMEZONE = "Europe/Tallinn";

/**
 * Format a UTC date to local time in the specified timezone
 */
export function formatLocalDateTime(
  date: Date | string,
  formatStr = "dd.MM.yyyy HH:mm",
  timezone = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Invalid date";
  return formatInTimeZone(d, timezone, formatStr);
}

/**
 * Format a UTC date to local date only
 */
export function formatLocalDate(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): string {
  return formatLocalDateTime(date, "dd.MM.yyyy", timezone);
}

/**
 * Format a UTC date to local time only
 */
export function formatLocalTime(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): string {
  return formatLocalDateTime(date, "HH:mm", timezone);
}

/**
 * Convert a local datetime to UTC
 */
export function localToUTC(
  date: Date,
  timezone = DEFAULT_TIMEZONE
): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Convert UTC to local timezone
 */
export function utcToLocal(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(d, timezone);
}

/**
 * Get current time in timezone
 */
export function nowInTimezone(timezone = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Check if a date is in the past (in local timezone)
 */
export function isPastInTimezone(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const now = nowInTimezone(timezone);
  const local = utcToLocal(d, timezone);
  return local < now;
}

/**
 * Format relative time (today, tomorrow, etc.)
 */
export function formatRelativeDate(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const local = utcToLocal(d, timezone);
  const now = nowInTimezone(timezone);
  
  const diffDays = Math.floor(
    (local.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return formatLocalDate(date, timezone);
}
