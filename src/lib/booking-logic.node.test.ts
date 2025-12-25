import { describe, it, expect } from 'vitest';
import { checkOverlap } from './booking-logic';
import { BookingStatus } from '@prisma/client';

describe('Booking Overlap Logic', () => {
  const baseTime = new Date('2025-01-01T10:00:00Z');
  const existingBookings = [
    {
      starts_at: new Date('2025-01-01T10:00:00Z'),
      ends_at: new Date('2025-01-01T11:00:00Z'),
      status: BookingStatus.CONFIRMED,
    }
  ];

  it('detects overlap when new booking starts inside existing', () => {
    const newStart = new Date('2025-01-01T10:30:00Z');
    const newEnd = new Date('2025-01-01T11:30:00Z');
    expect(checkOverlap(newStart, newEnd, existingBookings)).toBe(true);
  });

  it('detects overlap when new booking ends inside existing', () => {
    const newStart = new Date('2025-01-01T09:30:00Z');
    const newEnd = new Date('2025-01-01T10:30:00Z');
    expect(checkOverlap(newStart, newEnd, existingBookings)).toBe(true);
  });

  it('detects overlap when new booking envelops existing', () => {
    const newStart = new Date('2025-01-01T09:00:00Z');
    const newEnd = new Date('2025-01-01T12:00:00Z');
    expect(checkOverlap(newStart, newEnd, existingBookings)).toBe(true);
  });

  it('allows booking strictly after existing', () => {
    const newStart = new Date('2025-01-01T11:00:00Z');
    const newEnd = new Date('2025-01-01T12:00:00Z');
    expect(checkOverlap(newStart, newEnd, existingBookings)).toBe(false);
  });

  it('allows booking strictly before existing', () => {
    const newStart = new Date('2025-01-01T09:00:00Z');
    const newEnd = new Date('2025-01-01T10:00:00Z');
    expect(checkOverlap(newStart, newEnd, existingBookings)).toBe(false);
  });
  
  it('ignores cancelled bookings', () => {
      const cancelledBookings = [{
          starts_at: new Date('2025-01-01T10:00:00Z'),
          ends_at: new Date('2025-01-01T11:00:00Z'),
          status: BookingStatus.CANCELLED,
      }];
      const newStart = new Date('2025-01-01T10:00:00Z');
      const newEnd = new Date('2025-01-01T11:00:00Z');
      expect(checkOverlap(newStart, newEnd, cancelledBookings)).toBe(false);
  });
});
