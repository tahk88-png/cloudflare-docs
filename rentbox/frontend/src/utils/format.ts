import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('et-EE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  return `${days}d ${remainingHours}h`;
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
