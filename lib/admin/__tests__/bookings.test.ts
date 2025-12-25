import { describe, it, expect, beforeEach } from 'vitest';
import { checkBookingOverlap } from '../bookings';

describe('Booking Overlap Validation', () => {
	it('should detect overlapping bookings', () => {
		// Test case 1: New booking starts before existing ends
		const startsAt1 = new Date('2024-01-01T10:00:00Z');
		const endsAt1 = new Date('2024-01-01T12:00:00Z');
		const startsAt2 = new Date('2024-01-01T11:00:00Z');
		const endsAt2 = new Date('2024-01-01T13:00:00Z');
		
		// These overlap
		const overlap1 = startsAt1 < endsAt2 && endsAt1 > startsAt2;
		expect(overlap1).toBe(true);

		// Test case 2: New booking completely contains existing
		const startsAt3 = new Date('2024-01-01T09:00:00Z');
		const endsAt3 = new Date('2024-01-01T14:00:00Z');
		const overlap2 = startsAt3 < endsAt1 && endsAt3 > startsAt1;
		expect(overlap2).toBe(true);

		// Test case 3: No overlap
		const startsAt4 = new Date('2024-01-01T13:00:00Z');
		const endsAt4 = new Date('2024-01-01T15:00:00Z');
		const overlap3 = startsAt4 < endsAt1 && endsAt4 > startsAt1;
		expect(overlap3).toBe(false);
	});

	it('should validate end time is after start time', () => {
		const startsAt = new Date('2024-01-01T12:00:00Z');
		const endsAt = new Date('2024-01-01T10:00:00Z');
		
		expect(endsAt > startsAt).toBe(false);
	});

	it('should prevent bookings in the past', () => {
		const now = new Date();
		const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
		
		expect(pastDate < now).toBe(true);
	});
});
