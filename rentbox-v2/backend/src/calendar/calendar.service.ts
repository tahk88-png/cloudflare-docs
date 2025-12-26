import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, addDays, eachHourOfInterval, isWithinInterval } from 'date-fns';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private bookings: BookingsService,
  ) {}

  /**
   * Get availability slots for compartment
   */
  async getAvailability(compartmentId: string, startDate: Date, endDate: Date) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Get all bookings in range
    const bookings = await this.prisma.booking.findMany({
      where: {
        compartmentId,
        status: {
          in: ['paid', 'active'],
        },
        OR: [
          {
            AND: [
              { startAt: { lte: end } },
              { endAt: { gte: start } },
            ],
          },
        ],
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    // Get maintenance blocks
    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        compartmentId,
        OR: [
          {
            AND: [
              { startAt: { lte: end } },
              { endAt: { gte: start } },
            ],
          },
        ],
      },
    });

    // Generate hourly slots
    const slots: Array<{ startAt: Date; endAt: Date; available: boolean }> = [];
    const hours = eachHourOfInterval({ start, end });

    for (let i = 0; i < hours.length - 1; i++) {
      const slotStart = hours[i];
      const slotEnd = hours[i + 1];

      // Check if slot conflicts with bookings or maintenance
      const hasBookingConflict = bookings.some((booking) => {
        return (
          isWithinInterval(slotStart, { start: booking.startAt, end: booking.endAt }) ||
          isWithinInterval(slotEnd, { start: booking.startAt, end: booking.endAt }) ||
          (slotStart <= booking.startAt && slotEnd >= booking.endAt)
        );
      });

      const hasMaintenanceConflict = maintenanceBlocks.some((block) => {
        return (
          isWithinInterval(slotStart, { start: block.startAt, end: block.endAt }) ||
          isWithinInterval(slotEnd, { start: block.startAt, end: block.endAt }) ||
          (slotStart <= block.startAt && slotEnd >= block.endAt)
        );
      });

      slots.push({
        startAt: slotStart,
        endAt: slotEnd,
        available: !hasBookingConflict && !hasMaintenanceConflict,
      });
    }

    return { slots };
  }

  /**
   * Find next available slot
   */
  async findNextAvailable(compartmentId: string, durationHours: number) {
    const now = new Date();
    const endDate = addDays(now, 30); // Look ahead 30 days

    const availability = await this.getAvailability(compartmentId, now, endDate);

    // Find first slot with enough consecutive available hours
    for (let i = 0; i <= availability.slots.length - durationHours; i++) {
      const consecutiveSlots = availability.slots.slice(i, i + durationHours);
      if (consecutiveSlots.every((slot) => slot.available)) {
        return {
          startAt: consecutiveSlots[0].startAt,
          endAt: consecutiveSlots[consecutiveSlots.length - 1].endAt,
        };
      }
    }

    return null;
  }
}
