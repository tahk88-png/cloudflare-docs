import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number | string,
  currency = 'EUR',
  locale = 'et-EE'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(numAmount);
}

/**
 * Format date for display in Estonian
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('et-EE', options);
}

/**
 * Format time for display
 */
export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('et-EE', options);
}

/**
 * Format datetime for display
 */
export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('et-EE', options);
}

/**
 * Format duration in hours/days
 */
export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours} tund${hours === 1 ? '' : 'i'}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) {
    return `${days} päev${days === 1 ? '' : 'a'}`;
  }
  
  return `${days} päev${days === 1 ? '' : 'a'} ${remainingHours} tund${remainingHours === 1 ? '' : 'i'}`;
}

/**
 * Format countdown timer
 */
export function formatCountdown(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  display: string;
} {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  
  return {
    hours,
    minutes,
    seconds,
    display: parts.join(' '),
  };
}

/**
 * Generate a unique ID (for client-side use only)
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Check if running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Check if running on server side
 */
export const isServer = !isClient;

/**
 * Get booking status display text (Estonian)
 */
export function getBookingStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Ootel',
    PAID: 'Makstud',
    ACTIVE: 'Aktiivne',
    COMPLETED: 'Lõpetatud',
    OVERDUE: 'Tähtaeg ületatud',
    CANCELLED: 'Tühistatud',
    EXPIRED: 'Aegunud',
  };
  return statusMap[status] || status;
}

/**
 * Get booking status color
 */
export function getBookingStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-500',
    EXPIRED: 'bg-gray-100 text-gray-500',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}
