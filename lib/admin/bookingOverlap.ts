export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
	return aStart < bEnd && aEnd > bStart;
}

