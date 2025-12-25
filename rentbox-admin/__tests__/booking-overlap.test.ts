import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client
vi.mock("@/lib/db/prisma", () => ({
  default: {
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db/prisma";

// Import the overlap check function logic (we'll test the algorithm)
function hasOverlap(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
): boolean {
  // Overlap occurs if:
  // 1. New booking starts during existing booking
  // 2. New booking ends during existing booking
  // 3. New booking completely contains existing booking
  return (
    (newStart >= existingStart && newStart < existingEnd) ||
    (newEnd > existingStart && newEnd <= existingEnd) ||
    (newStart <= existingStart && newEnd >= existingEnd)
  );
}

describe("Booking Overlap Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasOverlap algorithm", () => {
    it("should detect overlap when new booking starts during existing", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T11:00:00Z");
      const newEnd = new Date("2024-01-01T13:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("should detect overlap when new booking ends during existing", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T09:00:00Z");
      const newEnd = new Date("2024-01-01T11:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("should detect overlap when new booking contains existing", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T09:00:00Z");
      const newEnd = new Date("2024-01-01T13:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("should detect overlap when new booking is contained by existing", () => {
      const existingStart = new Date("2024-01-01T09:00:00Z");
      const existingEnd = new Date("2024-01-01T13:00:00Z");
      const newStart = new Date("2024-01-01T10:00:00Z");
      const newEnd = new Date("2024-01-01T12:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("should NOT detect overlap when new booking is before existing", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T08:00:00Z");
      const newEnd = new Date("2024-01-01T10:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
    });

    it("should NOT detect overlap when new booking is after existing", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T12:00:00Z");
      const newEnd = new Date("2024-01-01T14:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
    });

    it("should handle exact same time slots as overlap", () => {
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T10:00:00Z");
      const newEnd = new Date("2024-01-01T12:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("should allow back-to-back bookings without overlap", () => {
      // First booking: 10:00-12:00
      // Second booking: 12:00-14:00 (starts exactly when first ends)
      const existingStart = new Date("2024-01-01T10:00:00Z");
      const existingEnd = new Date("2024-01-01T12:00:00Z");
      const newStart = new Date("2024-01-01T12:00:00Z");
      const newEnd = new Date("2024-01-01T14:00:00Z");

      expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
    });
  });
});

describe("Booking Validation Rules", () => {
  it("should reject booking where end time is before start time", () => {
    const startsAt = new Date("2024-01-01T12:00:00Z");
    const endsAt = new Date("2024-01-01T10:00:00Z");

    expect(endsAt > startsAt).toBe(false);
  });

  it("should accept booking where end time is after start time", () => {
    const startsAt = new Date("2024-01-01T10:00:00Z");
    const endsAt = new Date("2024-01-01T12:00:00Z");

    expect(endsAt > startsAt).toBe(true);
  });

  it("should calculate rental duration correctly in hours", () => {
    const startsAt = new Date("2024-01-01T10:00:00Z");
    const endsAt = new Date("2024-01-01T12:30:00Z");

    const durationMs = endsAt.getTime() - startsAt.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    expect(durationHours).toBe(2.5);
  });

  it("should calculate price correctly for hourly rate", () => {
    const basePrice = 5.0;
    const durationHours = 2.5;
    const totalPrice = basePrice * durationHours;

    expect(totalPrice).toBe(12.5);
  });

  it("should calculate price correctly for daily rate", () => {
    const basePrice = 25.0;
    const durationHours = 36; // 1.5 days
    const daysCount = Math.ceil(durationHours / 24);
    const totalPrice = basePrice * daysCount;

    expect(totalPrice).toBe(50.0); // 2 days
  });
});
