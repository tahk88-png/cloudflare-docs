import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { addHours, addDays, differenceInMinutes } from 'date-fns';

/**
 * AvailabilityService - Time-based availability management
 * 
 * This service is responsible for:
 * - Checking slot availability
 * - Finding alternative slots
 * - Generating availability calendars
 * 
 * The database exclusion constraint is the primary guard against double-booking.
 * This service provides defense-in-depth and user-friendly alternatives.
 */
@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a time slot is available for a compartment
   * 
   * This is a READ operation that checks:
   * 1. No overlapping bookings (active statuses)
   * 2. No maintenance blocks
   */
  async checkAvailability(
    compartmentId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    // Check for overlapping bookings
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        compartmentId,
        status: { in: ['PENDING', 'PAID', 'ACTIVE'] },
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
        // Time range overlap check
        OR: [
          {
            // New booking starts during existing booking
            startAt: { lte: startAt },
            endAt: { gt: startAt },
          },
          {
            // New booking ends during existing booking
            startAt: { lt: endAt },
            endAt: { gte: endAt },
          },
          {
            // New booking completely contains existing booking
            startAt: { gte: startAt },
            endAt: { lte: endAt },
          },
        ],
      },
    });

    if (overlappingBooking) {
      return false;
    }

    // Check for maintenance blocks
    const maintenanceBlock = await this.prisma.maintenanceBlock.findFirst({
      where: {
        compartmentId,
        OR: [
          { startAt: { lte: startAt }, endAt: { gt: startAt } },
          { startAt: { lt: endAt }, endAt: { gte: endAt } },
          { startAt: { gte: startAt }, endAt: { lte: endAt } },
        ],
      },
    });

    return !maintenanceBlock;
  }

  /**
   * Find alternative available slots for a product/location
   */
  async findAlternatives(
    productId: string,
    locationId: string,
    originalStartAt: Date,
    originalEndAt: Date,
    maxAlternatives = 3
  ): Promise<Array<{ startAt: Date; endAt: Date; compartmentId: string }>> {
    const duration = differenceInMinutes(originalEndAt, originalStartAt);
    const alternatives: Array<{ startAt: Date; endAt: Date; compartmentId: string }> = [];

    // Get all compartments with this product at this location
    const compartments = await this.prisma.compartment.findMany({
      where: {
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
        locker: { locationId, status: 'ONLINE' },
        productAssignments: {
          some: { productId, isActive: true },
        },
      },
      include: {
        locker: { include: { location: true } },
      },
    });

    // For each compartment, find next available slot
    for (const compartment of compartments) {
      if (alternatives.length >= maxAlternatives) break;

      const nextSlot = await this.findNextAvailableSlot(
        compartment.id,
        originalStartAt,
        duration
      );

      if (nextSlot) {
        alternatives.push({
          ...nextSlot,
          compartmentId: compartment.id,
        });
      }
    }

    // Sort by start time
    return alternatives.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  /**
   * Find the next available slot for a compartment
   */
  async findNextAvailableSlot(
    compartmentId: string,
    fromTime: Date,
    durationMinutes: number,
    maxLookaheadDays = 30
  ): Promise<{ startAt: Date; endAt: Date } | null> {
    const maxTime = addDays(fromTime, maxLookaheadDays);
    let currentTime = new Date(fromTime);

    while (currentTime < maxTime) {
      const potentialEndTime = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

      const isAvailable = await this.checkAvailability(
        compartmentId,
        currentTime,
        potentialEndTime
      );

      if (isAvailable) {
        return {
          startAt: currentTime,
          endAt: potentialEndTime,
        };
      }

      // Find the blocking event's end time
      const blockingBooking = await this.prisma.booking.findFirst({
        where: {
          compartmentId,
          status: { in: ['PENDING', 'PAID', 'ACTIVE'] },
          endAt: { gt: currentTime },
        },
        orderBy: { endAt: 'asc' },
      });

      const blockingMaintenance = await this.prisma.maintenanceBlock.findFirst({
        where: {
          compartmentId,
          endAt: { gt: currentTime },
        },
        orderBy: { endAt: 'asc' },
      });

      // Move to after the blocking event
      const nextTime = this.getEarliestEnd(blockingBooking?.endAt, blockingMaintenance?.endAt);
      
      if (!nextTime || nextTime >= maxTime) {
        return null;
      }

      currentTime = nextTime;
    }

    return null;
  }

  /**
   * Get availability calendar for a month
   */
  async getAvailabilityCalendar(
    productId: string,
    locationId: string,
    year: number,
    month: number,
    timezone = 'Europe/Tallinn'
  ) {
    // Get all compartments with this product
    const compartments = await this.prisma.compartment.findMany({
      where: {
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
        locker: { locationId, status: 'ONLINE' },
        productAssignments: {
          some: { productId, isActive: true },
        },
      },
    });

    const compartmentIds = compartments.map((c) => c.id);

    // Get location for operating hours
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    // Build calendar for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Get all bookings in this period
    const bookings = await this.prisma.booking.findMany({
      where: {
        compartmentId: { in: compartmentIds },
        status: { in: ['PENDING', 'PAID', 'ACTIVE'] },
        OR: [
          { startAt: { gte: startOfMonth, lte: endOfMonth } },
          { endAt: { gte: startOfMonth, lte: endOfMonth } },
          { startAt: { lte: startOfMonth }, endAt: { gte: endOfMonth } },
        ],
      },
    });

    // Get maintenance blocks
    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        compartmentId: { in: compartmentIds },
        OR: [
          { startAt: { gte: startOfMonth, lte: endOfMonth } },
          { endAt: { gte: startOfMonth, lte: endOfMonth } },
          { startAt: { lte: startOfMonth }, endAt: { gte: endOfMonth } },
        ],
      },
    });

    // Build daily availability
    const days: Array<{
      date: string;
      isOperating: boolean;
      availability: 'FULL' | 'PARTIAL' | 'NONE';
      availableHours: number;
      totalHours: number;
    }> = [];

    const daysInMonth = endOfMonth.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const operatingHours = (location?.operatingHours as any)?.[dayOfWeek];

      if (!operatingHours || !operatingHours.open) {
        days.push({
          date: date.toISOString().split('T')[0],
          isOperating: false,
          availability: 'NONE',
          availableHours: 0,
          totalHours: 0,
        });
        continue;
      }

      // Calculate available hours for this day
      const [openHour] = operatingHours.open.split(':').map(Number);
      const [closeHour] = operatingHours.close.split(':').map(Number);
      const totalHours = closeHour - openHour;

      // Count booked hours across all compartments
      let bookedHours = 0;
      for (const booking of bookings) {
        const bookingStart = new Date(Math.max(booking.startAt.getTime(), date.getTime()));
        const bookingEnd = new Date(
          Math.min(booking.endAt.getTime(), new Date(date.getTime() + 24 * 60 * 60 * 1000).getTime())
        );
        
        if (bookingStart < bookingEnd) {
          bookedHours += differenceInMinutes(bookingEnd, bookingStart) / 60;
        }
      }

      const totalAvailableHours = totalHours * compartments.length;
      const availableHours = Math.max(0, totalAvailableHours - bookedHours);
      const availabilityRatio = availableHours / totalAvailableHours;

      days.push({
        date: date.toISOString().split('T')[0],
        isOperating: true,
        availability:
          availabilityRatio > 0.7 ? 'FULL' :
          availabilityRatio > 0 ? 'PARTIAL' : 'NONE',
        availableHours: Math.round(availableHours),
        totalHours: totalAvailableHours,
      });
    }

    return {
      productId,
      locationId,
      month: `${year}-${month.toString().padStart(2, '0')}`,
      timezone,
      compartmentCount: compartments.length,
      days,
    };
  }

  /**
   * Get detailed availability slots for a specific day
   */
  async getDaySlots(
    productId: string,
    locationId: string,
    date: Date,
    slotDurationMinutes = 60
  ) {
    // Get compartments
    const compartments = await this.prisma.compartment.findMany({
      where: {
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
        locker: { locationId, status: 'ONLINE' },
        productAssignments: {
          some: { productId, isActive: true },
        },
      },
      include: {
        locker: { include: { location: true } },
      },
    });

    // Get location operating hours
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const operatingHours = (location?.operatingHours as any)?.[dayOfWeek];

    if (!operatingHours || !operatingHours.open) {
      return { slots: [], isOperating: false };
    }

    const [openHour, openMinute = 0] = operatingHours.open.split(':').map(Number);
    const [closeHour, closeMinute = 0] = operatingHours.close.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(openHour, openMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(closeHour, closeMinute, 0, 0);

    // Generate time slots
    const slots: Array<{
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      availableCompartments: number;
    }> = [];

    let slotStart = new Date(dayStart);
    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);
      if (slotEnd > dayEnd) break;

      // Check availability across all compartments
      let availableCount = 0;
      for (const compartment of compartments) {
        const isAvailable = await this.checkAvailability(
          compartment.id,
          slotStart,
          slotEnd
        );
        if (isAvailable) availableCount++;
      }

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isAvailable: availableCount > 0,
        availableCompartments: availableCount,
      });

      slotStart = slotEnd;
    }

    return {
      slots,
      isOperating: true,
      operatingHours,
      compartmentCount: compartments.length,
    };
  }

  private getEarliestEnd(date1?: Date | null, date2?: Date | null): Date | null {
    if (!date1 && !date2) return null;
    if (!date1) return date2!;
    if (!date2) return date1;
    return date1 < date2 ? date1 : date2;
  }
}
