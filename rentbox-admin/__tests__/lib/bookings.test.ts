import { checkBookingOverlap, validateBookingDates } from '@/lib/admin/bookings';
import { prisma } from '@/lib/db/prisma';
import { BookingStatus } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
    },
  },
}));

describe('Booking Overlap Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect no overlap when compartment is free', async () => {
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const startsAt = new Date('2024-01-01T10:00:00Z');
    const endsAt = new Date('2024-01-01T12:00:00Z');
    const compartmentId = 'comp-123';

    const result = await checkBookingOverlap(compartmentId, startsAt, endsAt);

    expect(result.hasOverlap).toBe(false);
    expect(result.conflictingBookings).toBeUndefined();
  });

  it('should detect overlap with existing booking', async () => {
    const existingBooking = {
      id: 'booking-1',
      startsAt: new Date('2024-01-01T11:00:00Z'),
      endsAt: new Date('2024-01-01T13:00:00Z'),
      status: BookingStatus.CONFIRMED,
    };

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([existingBooking]);

    const startsAt = new Date('2024-01-01T10:00:00Z');
    const endsAt = new Date('2024-01-01T12:00:00Z');
    const compartmentId = 'comp-123';

    const result = await checkBookingOverlap(compartmentId, startsAt, endsAt);

    expect(result.hasOverlap).toBe(true);
    expect(result.conflictingBookings).toHaveLength(1);
    expect(result.conflictingBookings?.[0].id).toBe('booking-1');
  });

  it('should not detect overlap with cancelled bookings', async () => {
    const cancelledBooking = {
      id: 'booking-1',
      startsAt: new Date('2024-01-01T11:00:00Z'),
      endsAt: new Date('2024-01-01T13:00:00Z'),
      status: BookingStatus.CANCELLED,
    };

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const startsAt = new Date('2024-01-01T10:00:00Z');
    const endsAt = new Date('2024-01-01T12:00:00Z');
    const compartmentId = 'comp-123';

    const result = await checkBookingOverlap(compartmentId, startsAt, endsAt);

    expect(result.hasOverlap).toBe(false);
  });

  it('should exclude specific booking when checking overlap', async () => {
    const existingBooking = {
      id: 'booking-1',
      startsAt: new Date('2024-01-01T11:00:00Z'),
      endsAt: new Date('2024-01-01T13:00:00Z'),
      status: BookingStatus.CONFIRMED,
    };

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const startsAt = new Date('2024-01-01T10:00:00Z');
    const endsAt = new Date('2024-01-01T12:00:00Z');
    const compartmentId = 'comp-123';

    const result = await checkBookingOverlap(
      compartmentId,
      startsAt,
      endsAt,
      'booking-1' // Exclude this booking
    );

    expect(result.hasOverlap).toBe(false);
  });

  it('should not detect overlap for adjacent bookings', async () => {
    const existingBooking = {
      id: 'booking-1',
      startsAt: new Date('2024-01-01T12:00:00Z'),
      endsAt: new Date('2024-01-01T14:00:00Z'),
      status: BookingStatus.CONFIRMED,
    };

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const startsAt = new Date('2024-01-01T10:00:00Z');
    const endsAt = new Date('2024-01-01T12:00:00Z');
    const compartmentId = 'comp-123';

    const result = await checkBookingOverlap(compartmentId, startsAt, endsAt);

    expect(result.hasOverlap).toBe(false);
  });
});

describe('Booking Date Validation', () => {
  it('should validate correct booking dates', () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

    const result = validateBookingDates(startsAt, endsAt);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject booking with end time before start time', () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const endsAt = new Date(Date.now() + 60 * 60 * 1000);

    const result = validateBookingDates(startsAt, endsAt);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('End time must be after start time');
  });

  it('should reject booking in the past', () => {
    const startsAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const endsAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const result = validateBookingDates(startsAt, endsAt);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Start time cannot be in the past');
  });

  it('should reject booking shorter than 15 minutes', () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 10 * 60 * 1000); // 10 minutes later

    const result = validateBookingDates(startsAt, endsAt);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Booking must be at least 15 minutes long');
  });

  it('should accept booking exactly 15 minutes long', () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 15 * 60 * 1000); // 15 minutes later

    const result = validateBookingDates(startsAt, endsAt);

    expect(result.valid).toBe(true);
  });
});
