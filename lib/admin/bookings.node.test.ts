import { describe, expect, it } from "vitest";

import { intervalsOverlap } from "./bookingOverlap";

describe("intervalsOverlap", () => {
	it("returns false for back-to-back intervals", () => {
		const aStart = new Date("2025-01-01T10:00:00Z");
		const aEnd = new Date("2025-01-01T11:00:00Z");
		const bStart = new Date("2025-01-01T11:00:00Z");
		const bEnd = new Date("2025-01-01T12:00:00Z");
		expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
		expect(intervalsOverlap(bStart, bEnd, aStart, aEnd)).toBe(false);
	});

	it("returns true when intervals overlap", () => {
		const aStart = new Date("2025-01-01T10:00:00Z");
		const aEnd = new Date("2025-01-01T12:00:00Z");
		const bStart = new Date("2025-01-01T11:59:59Z");
		const bEnd = new Date("2025-01-01T13:00:00Z");
		expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
	});

	it("returns false when completely disjoint", () => {
		const aStart = new Date("2025-01-01T10:00:00Z");
		const aEnd = new Date("2025-01-01T11:00:00Z");
		const bStart = new Date("2025-01-01T12:00:00Z");
		const bEnd = new Date("2025-01-01T13:00:00Z");
		expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
	});
});

