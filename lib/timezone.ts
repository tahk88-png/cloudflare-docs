import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const RENTBOX_TIMEZONE = 'Europe/Tallinn';

export function toRentboxTime(date: Date): Date {
	return toZonedTime(date, RENTBOX_TIMEZONE);
}

export function fromRentboxTime(date: Date): Date {
	return fromZonedTime(date, RENTBOX_TIMEZONE);
}

export function formatInRentboxTimeZone(
	date: Date | string,
	formatStr: string,
): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return formatInTimeZone(d, RENTBOX_TIMEZONE, formatStr);
}

export function nowInRentboxTimeZone(): Date {
	return toZonedTime(new Date(), RENTBOX_TIMEZONE);
}

export { RENTBOX_TIMEZONE };
