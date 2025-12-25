import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const RENTBOX_TZ = "Europe/Tallinn";

export function formatTallinn(date: Date, fmt = "yyyy-MM-dd HH:mm") {
	return formatInTimeZone(date, RENTBOX_TZ, fmt);
}

export function toTallinn(dateUtc: Date) {
	return toZonedTime(dateUtc, RENTBOX_TZ);
}

export function tallinnToUtc(localDateTime: Date) {
	return fromZonedTime(localDateTime, RENTBOX_TZ);
}

export function tallinnLocalPartsToUtc(input: {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
	hour: number;
	minute: number;
}) {
	// Construct a "local" date and interpret it in Europe/Tallinn.
	const local = new Date(
		Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0),
	);
	return fromZonedTime(local, RENTBOX_TZ);
}

