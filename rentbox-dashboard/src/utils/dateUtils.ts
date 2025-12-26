import { formatDistanceToNow, format, isPast, differenceInHours, differenceInDays } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatTimeRemaining(endDate: string | Date): string {
  const end = new Date(endDate);
  const now = new Date();

  if (isPast(end)) {
    return 'Expired';
  }

  const hours = differenceInHours(end, now);
  const days = differenceInDays(end, now);

  if (hours < 1) {
    return 'Less than 1 hour left';
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} left`;
  } else {
    return formatDistanceToNow(end, { addSuffix: true });
  }
}

export function formatCountdown(startDate: string | Date): string {
  const start = new Date(startDate);

  if (isPast(start)) {
    return 'Started';
  }

  return formatDistanceToNow(start, { addSuffix: true });
}

export function getTimeRemainingColor(endDate: string | Date): string {
  const end = new Date(endDate);
  const now = new Date();
  const hours = differenceInHours(end, now);

  if (hours < 0) {
    return 'text-error-600';
  } else if (hours < 24) {
    return 'text-warning-600';
  }
  
  return 'text-success-600';
}
