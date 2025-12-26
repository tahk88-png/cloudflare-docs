import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addMinutes, startOfDay } from 'date-fns';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
    });
  }

  async getSlots(productId: string, date: string, stepMinutes: number, durationMinutes: number, tz: string) {
    const targetDate = new Date(date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = addMinutes(dayStart, 24 * 60);

    // Get all compartments that have this product
    const compartments = await this.prisma.compartmentProduct.findMany({
      where: { productId },
      include: { compartment: { include: { locker: true } } },
    });

    // Get existing bookings and calendar events for these compartments
    const bookings = await this.prisma.booking.findMany({
      where: {
        compartmentId: { in: compartments.map(c => c.compartmentId) },
        OR: [
          { startAt: { gte: dayStart, lt: dayEnd } },
          { endAt: { gt: dayStart, lte: dayEnd } },
          { startAt: { lte: dayStart }, endAt: { gte: dayEnd } },
        ],
        status: { not: 'CANCELLED' },
      },
    });

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        OR: [
          { scope: 'global' },
          { scope: 'locker', meta: { path: ['lockerId'], in: compartments.map(c => c.compartment.lockerId) } },
          { scope: 'compartment', meta: { path: ['compartmentId'], in: compartments.map(c => c.compartmentId) } },
        ],
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: 'active',
      },
    });

    // Generate slots
    const slots = [];
    let current = dayStart;
    while (current < dayEnd) {
      const slotEnd = addMinutes(current, durationMinutes);
      if (slotEnd > dayEnd) break;

      // Check if slot is available
      const isBooked = bookings.some(b => {
        return (b.startAt < slotEnd && b.endAt > current);
      });

      const isBlocked = events.some(e => {
        return (e.startAt < slotEnd && e.endAt > current);
      });

      if (!isBooked && !isBlocked) {
        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          available: compartments.length,
        });
      }

      current = addMinutes(current, stepMinutes);
    }

    return { slots, compartments: compartments.length };
  }
}
