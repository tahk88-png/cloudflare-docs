import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { RedisService } from '../redis/redis.service';
import { addMinutes, isAfter, isBefore } from 'date-fns';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Create a new booking (pending status)
   * Uses Redis lock to prevent race conditions
   */
  async create(userId: string, dto: CreateBookingDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    // Validate time range
    if (isAfter(startAt, endAt)) {
      throw new BadRequestException('End time must be after start time');
    }

    if (isBefore(startAt, new Date())) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    // Check availability first (without lock for quick feedback)
    const available = await this.checkAvailability(dto.compartmentId, startAt, endAt);
    if (!available.available) {
      throw new ConflictException('Compartment not available for selected time range');
    }

    // Get product pricing
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        pricing: {
          orderBy: { durationType: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate price based on duration
    const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    const pricing = this.calculatePricing(product.pricing, durationHours);
    const totalPrice = pricing.totalPrice;
    const depositAmount = pricing.deposit;

    // Acquire distributed lock
    const lockKey = `booking:lock:${dto.compartmentId}:${startAt.toISOString()}:${endAt.toISOString()}`;
    const lock = await this.redis.acquireLock(lockKey, 30); // 30 second lock

    try {
      // Double-check availability with lock
      const availableWithLock = await this.checkAvailability(dto.compartmentId, startAt, endAt);
      if (!availableWithLock.available) {
        throw new ConflictException('Compartment not available (conflict detected)');
      }

      // Create booking
      const booking = await this.prisma.booking.create({
        data: {
          userId,
          productId: dto.productId,
          compartmentId: dto.compartmentId,
          startAt,
          endAt,
          status: 'pending',
          totalPrice,
          depositAmount,
          currency: 'EUR',
        },
        include: {
          product: true,
          compartment: {
            include: {
              locker: true,
            },
          },
        },
      });

      // Set TTL for pending booking (15 minutes)
      await this.redis.setWithTTL(
        `booking:pending:${booking.id}`,
        '1',
        15 * 60, // 15 minutes
      );

      return {
        ...booking,
        expiresAt: addMinutes(new Date(), 15).toISOString(),
      };
    } finally {
      await this.redis.releaseLock(lockKey, lock);
    }
  }

  /**
   * Check if compartment is available for time range
   */
  async checkAvailability(compartmentId: string, startAt: Date, endAt: Date) {
    // Check for overlapping active bookings
    const conflicts = await this.prisma.booking.findMany({
      where: {
        compartmentId,
        status: {
          in: ['paid', 'active'],
        },
        OR: [
          {
            AND: [
              { startAt: { lte: startAt } },
              { endAt: { gt: startAt } },
            ],
          },
          {
            AND: [
              { startAt: { lt: endAt } },
              { endAt: { gte: endAt } },
            ],
          },
          {
            AND: [
              { startAt: { gte: startAt } },
              { endAt: { lte: endAt } },
            ],
          },
        ],
      },
    });

    // Check maintenance blocks
    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        compartmentId,
        OR: [
          {
            AND: [
              { startAt: { lte: startAt } },
              { endAt: { gt: startAt } },
            ],
          },
          {
            AND: [
              { startAt: { lt: endAt } },
              { endAt: { gte: endAt } },
            ],
          },
          {
            AND: [
              { startAt: { gte: startAt } },
              { endAt: { lte: endAt } },
            ],
          },
        ],
      },
    });

    return {
      available: conflicts.length === 0 && maintenanceBlocks.length === 0,
      conflicts: conflicts.map((b) => ({
        bookingId: b.id,
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
      })),
      maintenanceBlocks: maintenanceBlocks.map((mb) => ({
        id: mb.id,
        startAt: mb.startAt,
        endAt: mb.endAt,
        reason: mb.reason,
      })),
    };
  }

  /**
   * Calculate pricing based on duration
   */
  private calculatePricing(pricing: Array<{ durationType: string; price: any; deposit: any }>, durationHours: number) {
    // Prefer day pricing for >= 24 hours, otherwise hourly
    let selectedPricing = pricing.find((p) => p.durationType === 'hour');

    if (durationHours >= 24) {
      const dayPricing = pricing.find((p) => p.durationType === 'day');
      if (dayPricing) {
        const days = Math.ceil(durationHours / 24);
        return {
          totalPrice: Number(dayPricing.price) * days,
          deposit: Number(dayPricing.deposit),
        };
      }
    }

    if (!selectedPricing) {
      throw new Error('No pricing found for product');
    }

    return {
      totalPrice: Number(selectedPricing.price) * Math.ceil(durationHours),
      deposit: Number(selectedPricing.deposit),
    };
  }

  /**
   * Get booking by ID
   */
  async findOne(id: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        product: true,
        compartment: {
          include: {
            locker: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        contract: true,
        return: {
          include: {
            photos: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check authorization
    if (userId && booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Get user bookings
   */
  async findByUser(userId: string, status?: string) {
    return this.prisma.booking.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        product: true,
        compartment: {
          include: {
            locker: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Extend booking duration
   */
  async extend(id: string, userId: string, dto: ExtendBookingDto) {
    const booking = await this.findOne(id, userId);

    if (booking.status !== 'active') {
      throw new BadRequestException('Only active bookings can be extended');
    }

    const newEndAt = new Date(dto.newEndAt);

    if (isBefore(newEndAt, booking.endAt)) {
      throw new BadRequestException('New end time must be after current end time');
    }

    // Check availability for extension
    const available = await this.checkAvailability(booking.compartmentId, booking.endAt, newEndAt);
    if (!available.available) {
      throw new ConflictException('Compartment not available for extended time');
    }

    // Calculate extension fee
    const extensionHours = (newEndAt.getTime() - booking.endAt.getTime()) / (1000 * 60 * 60);
    const product = await this.prisma.product.findUnique({
      where: { id: booking.productId },
      include: { pricing: true },
    });

    const pricing = this.calculatePricing(product.pricing, extensionHours);
    const extensionFee = pricing.totalPrice;

    // Update booking
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        endAt: newEndAt,
        totalPrice: {
          increment: extensionFee,
        },
      },
    });

    // Record extension
    await this.prisma.bookingExtension.create({
      data: {
        bookingId: id,
        originalEndAt: booking.endAt,
        newEndAt,
        fee: extensionFee,
      },
    });

    return updated;
  }

  /**
   * Cancel booking
   */
  async cancel(id: string, userId: string) {
    const booking = await this.findOne(id, userId);

    if (!['pending', 'paid'].includes(booking.status)) {
      throw new BadRequestException('Only pending or paid bookings can be cancelled');
    }

    // If paid, refund logic would go here
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });
  }
}
