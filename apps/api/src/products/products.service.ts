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

    // Get all events that might affect these compartments
    // Simplified: get all active events in the time range, filter in code
    const allEvents = await this.prisma.calendarEvent.findMany({
      where: {
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: 'active',
      },
    });

    const lockerIds = compartments.map(c => c.compartment.lockerId);
    const compartmentIds = compartments.map(c => c.compartmentId);
    
    // Filter events that affect our compartments
    const events = allEvents.filter(e => {
      if (e.scope === 'global') return true;
      if (e.scope === 'locker') {
        const meta = e.meta as any;
        return meta?.lockerId && lockerIds.includes(meta.lockerId);
      }
      if (e.scope === 'compartment') {
        const meta = e.meta as any;
        return meta?.compartmentId && compartmentIds.includes(meta.compartmentId);
      }
      return false;
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
