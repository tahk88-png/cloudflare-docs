import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AvailabilityService } from './availability.service';
import { NotificationService } from '../notification/notification.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';
import { addMinutes, addHours, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * BookingService - Core booking engine
 * 
 * CRITICAL INVARIANTS:
 * 1. No double bookings - enforced by database exclusion constraint
 * 2. All times are TIMESTAMPTZ
 * 3. Pending bookings expire after TTL
 * 4. Status transitions are validated
 */
@Injectable()
export class BookingService {
  private readonly pendingTtlMinutes: number;
  private readonly gracePeriodMinutes: number;
  private readonly lateFeeMultiplier: number;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private availabilityService: AvailabilityService,
    private notificationService: NotificationService,
    private configService: ConfigService,
    @InjectQueue('booking') private bookingQueue: Queue,
  ) {
    this.pendingTtlMinutes = this.configService.get<number>('BOOKING_PENDING_TTL_MINUTES') || 15;
    this.gracePeriodMinutes = this.configService.get<number>('BOOKING_GRACE_PERIOD_MINUTES') || 30;
    this.lateFeeMultiplier = this.configService.get<number>('LATE_FEE_MULTIPLIER') || 1.5;
  }

  /**
   * Create a new booking
   * 
   * Flow:
   * 1. Acquire distributed lock on compartment
   * 2. Verify availability (double-check despite DB constraint)
   * 3. Calculate pricing
   * 4. Create booking with PENDING status
   * 5. Schedule expiration job
   * 6. Release lock
   */
  async createBooking(userId: string, dto: CreateBookingDto, idempotencyKey?: string) {
    // Check idempotency
    if (idempotencyKey) {
      const cached = await this.redis.get(`idempotency:booking:${idempotencyKey}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const lockKey = `lock:compartment:${dto.compartmentId}`;
    const lockAcquired = await this.redis.acquireLock(lockKey, 10000);

    if (!lockAcquired) {
      throw new ConflictException({
        code: 'SLOT_BUSY',
        message: 'Another customer is currently booking this slot. Please try again in a moment.',
        action: 'Wait a few seconds and retry.',
      });
    }

    try {
      // Verify compartment and product exist
      const compartment = await this.prisma.compartment.findUnique({
        where: { id: dto.compartmentId },
        include: {
          locker: { include: { location: true } },
          productAssignments: { where: { isActive: true }, include: { product: true } },
        },
      });

      if (!compartment) {
        throw new NotFoundException('Compartment not found');
      }

      // Verify product is assigned to this compartment
      const productAssignment = compartment.productAssignments.find(
        (pa) => pa.productId === dto.productId
      );
      if (!productAssignment) {
        throw new BadRequestException('Product is not available at this compartment');
      }

      const product = productAssignment.product;

      // Parse and validate times
      const startAt = new Date(dto.startAt);
      const endAt = new Date(dto.endAt);

      if (isAfter(startAt, endAt)) {
        throw new BadRequestException('End time must be after start time');
      }

      const durationHours = differenceInMinutes(endAt, startAt) / 60;
      if (durationHours < product.minRentalHours) {
        throw new BadRequestException(
          `Minimum rental duration is ${product.minRentalHours} hour(s)`
        );
      }

      const durationDays = durationHours / 24;
      if (durationDays > product.maxRentalDays) {
        throw new BadRequestException(
          `Maximum rental duration is ${product.maxRentalDays} day(s)`
        );
      }

      // Verify availability (defense in depth - DB constraint is primary)
      const isAvailable = await this.availabilityService.checkAvailability(
        dto.compartmentId,
        startAt,
        endAt
      );

      if (!isAvailable) {
        const alternatives = await this.availabilityService.findAlternatives(
          dto.productId,
          compartment.locker.locationId,
          startAt,
          endAt
        );

        throw new ConflictException({
          code: 'SLOT_UNAVAILABLE',
          message: 'This time slot was just booked by another customer.',
          action: 'Please select a different time.',
          alternatives,
        });
      }

      // Calculate pricing
      const pricing = this.calculatePricing(
        product.pricePerHour,
        product.pricePerDay,
        product.depositAmount,
        startAt,
        endAt
      );

      // Generate access PIN
      const accessPin = this.generateAccessPin();

      // Create booking
      const booking = await this.prisma.booking.create({
        data: {
          userId,
          productId: dto.productId,
          compartmentId: dto.compartmentId,
          startAt,
          endAt,
          hourlyRate: product.pricePerHour,
          dailyRate: product.pricePerDay,
          depositAmount: product.depositAmount,
          subtotal: pricing.subtotal,
          taxAmount: pricing.taxAmount,
          totalAmount: pricing.total,
          status: BookingStatus.PENDING,
          expiresAt: addMinutes(new Date(), this.pendingTtlMinutes),
          accessPin,
          timezone: dto.timezone || 'Europe/Tallinn',
        },
        include: {
          product: true,
          compartment: {
            include: {
              locker: { include: { location: true } },
            },
          },
          user: true,
        },
      });

      // Schedule expiration job
      await this.bookingQueue.add(
        'expire-pending',
        { bookingId: booking.id },
        { delay: this.pendingTtlMinutes * 60 * 1000 }
      );

      // Prepare response
      const response = {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        expiresAt: booking.expiresAt,
        product: {
          id: booking.product.id,
          name: booking.product.name,
        },
        location: {
          id: booking.compartment.locker.location.id,
          name: booking.compartment.locker.location.name,
          address: booking.compartment.locker.location.address,
        },
        compartment: {
          id: booking.compartment.id,
          lockerName: booking.compartment.locker.name,
          number: booking.compartment.number,
        },
        schedule: {
          startAt: booking.startAt,
          endAt: booking.endAt,
          durationHours: Math.ceil(differenceInMinutes(endAt, startAt) / 60),
          timezone: booking.timezone,
        },
        pricing: {
          subtotal: pricing.subtotal.toFixed(2),
          taxAmount: pricing.taxAmount.toFixed(2),
          deposit: pricing.deposit.toFixed(2),
          total: pricing.total.toFixed(2),
          currency: 'EUR',
        },
        nextSteps: {
          action: 'COMPLETE_CHECKOUT',
          url: `/checkout/${booking.id}`,
          expiresInSeconds: this.pendingTtlMinutes * 60,
        },
      };

      // Cache for idempotency
      if (idempotencyKey) {
        await this.redis.setex(
          `idempotency:booking:${idempotencyKey}`,
          86400,
          JSON.stringify(response)
        );
      }

      // Create audit log
      await this.createAuditLog(userId, 'booking.create', 'Booking', booking.id, null, booking);

      return response;
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  /**
   * Transition booking to PAID status after successful payment
   */
  async confirmPayment(bookingId: string, paymentId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, product: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException({
        code: 'INVALID_STATE',
        message: `Cannot confirm payment for booking in ${booking.status} status`,
      });
    }

    // Check if expired
    if (booking.expiresAt && isAfter(new Date(), booking.expiresAt)) {
      throw new ConflictException({
        code: 'BOOKING_EXPIRED',
        message: 'This booking has expired. Please create a new booking.',
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.PAID,
        expiresAt: null, // Clear expiration
      },
    });

    // Send confirmation notification
    await this.notificationService.sendBookingConfirmed(booking);

    // Schedule rental start reminder
    const reminderTime = addHours(booking.startAt, -1);
    if (isAfter(reminderTime, new Date())) {
      await this.bookingQueue.add(
        'rental-start-reminder',
        { bookingId: booking.id },
        { delay: reminderTime.getTime() - Date.now() }
      );
    }

    return updated;
  }

  /**
   * Activate booking when rental period starts
   */
  async activateBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PAID) {
      throw new ConflictException({
        code: 'INVALID_STATE',
        message: `Cannot activate booking in ${booking.status} status`,
      });
    }

    // Can activate 15 minutes before start time
    const activationWindow = addMinutes(booking.startAt, -15);
    if (isBefore(new Date(), activationWindow)) {
      throw new BadRequestException({
        code: 'TOO_EARLY',
        message: 'Your rental period has not started yet.',
        startsAt: booking.startAt,
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.ACTIVE,
        firstAccessedAt: new Date(),
      },
    });

    // Update compartment status
    await this.prisma.compartment.update({
      where: { id: booking.compartmentId },
      data: { status: 'OCCUPIED' },
    });

    // Schedule return reminder
    const reminderTime = addMinutes(booking.endAt, -30);
    await this.bookingQueue.add(
      'return-reminder',
      { bookingId: booking.id },
      { delay: Math.max(0, reminderTime.getTime() - Date.now()) }
    );

    // Schedule overdue check
    await this.bookingQueue.add(
      'check-overdue',
      { bookingId: booking.id },
      { delay: booking.endAt.getTime() - Date.now() + this.gracePeriodMinutes * 60 * 1000 }
    );

    return updated;
  }

  /**
   * Complete booking when item is returned
   */
  async completeBooking(bookingId: string, returnedAt: Date) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.ACTIVE && booking.status !== BookingStatus.OVERDUE) {
      throw new ConflictException({
        code: 'INVALID_STATE',
        message: `Cannot complete booking in ${booking.status} status`,
      });
    }

    // Calculate late fee if applicable
    let lateFee = 0;
    if (isAfter(returnedAt, addMinutes(booking.endAt, this.gracePeriodMinutes))) {
      const lateMinutes = differenceInMinutes(
        returnedAt,
        addMinutes(booking.endAt, this.gracePeriodMinutes)
      );
      const lateHours = Math.ceil(lateMinutes / 60);
      lateFee = lateHours * Number(booking.hourlyRate) * this.lateFeeMultiplier;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        actualReturnAt: returnedAt,
        lateFeeAmount: lateFee,
      },
    });

    // Update compartment status
    await this.prisma.compartment.update({
      where: { id: booking.compartmentId },
      data: { status: 'AVAILABLE' },
    });

    // Send confirmation
    await this.notificationService.sendReturnConfirmed(booking, lateFee);

    return updated;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, userId: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (!['PENDING', 'PAID'].includes(booking.status)) {
      throw new ConflictException({
        code: 'CANNOT_CANCEL',
        message: `Cannot cancel a booking that is ${booking.status.toLowerCase()}`,
      });
    }

    // Check cancellation policy
    if (booking.status === 'PAID') {
      const hoursUntilStart = differenceInMinutes(booking.startAt, new Date()) / 60;
      if (hoursUntilStart < 12) {
        throw new ConflictException({
          code: 'CANCELLATION_DEADLINE_PASSED',
          message: 'Cancellations must be made at least 12 hours before the rental start time.',
          action: 'Contact support if you need assistance.',
        });
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        statusReason: reason,
      },
    });

    await this.createAuditLog(
      userId,
      'booking.cancel',
      'Booking',
      bookingId,
      { status: booking.status },
      { status: 'CANCELLED', reason }
    );

    return updated;
  }

  /**
   * Extend booking duration
   */
  async extendBooking(bookingId: string, userId: string, dto: ExtendBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { product: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only extend your own bookings');
    }

    if (booking.status !== BookingStatus.ACTIVE) {
      throw new ConflictException({
        code: 'CANNOT_EXTEND',
        message: 'Only active rentals can be extended',
      });
    }

    const newEndAt = new Date(dto.newEndAt);

    if (!isAfter(newEndAt, booking.endAt)) {
      throw new BadRequestException('New end time must be after current end time');
    }

    // Check availability for extension
    const isAvailable = await this.availabilityService.checkAvailability(
      booking.compartmentId,
      booking.endAt,
      newEndAt,
      bookingId // Exclude current booking
    );

    if (!isAvailable) {
      // Find max possible extension
      const nextBooking = await this.prisma.booking.findFirst({
        where: {
          compartmentId: booking.compartmentId,
          status: { in: ['PENDING', 'PAID', 'ACTIVE'] },
          id: { not: bookingId },
          startAt: { gt: booking.endAt },
        },
        orderBy: { startAt: 'asc' },
      });

      throw new ConflictException({
        code: 'EXTENSION_BLOCKED',
        message: 'Cannot extend - another booking starts soon.',
        action: `Return by ${formatInTimeZone(booking.endAt, booking.timezone, 'HH:mm')} or contact support.`,
        details: {
          maxExtensionUntil: nextBooking
            ? addMinutes(nextBooking.startAt, -30)
            : null,
          blockingBookingStarts: nextBooking?.startAt,
        },
      });
    }

    // Calculate additional cost
    const additionalHours = differenceInMinutes(newEndAt, booking.endAt) / 60;
    const additionalAmount =
      additionalHours <= 24
        ? Math.ceil(additionalHours) * Number(booking.hourlyRate)
        : Math.ceil(additionalHours / 24) * Number(booking.dailyRate);

    // Create extension request
    const extension = await this.prisma.bookingExtension.create({
      data: {
        bookingId,
        previousEndAt: booking.endAt,
        newEndAt,
        additionalAmount,
        status: 'PENDING',
      },
    });

    return {
      extensionId: extension.id,
      bookingId,
      previousEndAt: booking.endAt,
      newEndAt,
      additionalHours: Math.ceil(additionalHours),
      additionalAmount: additionalAmount.toFixed(2),
      status: 'PENDING',
      paymentRequired: true,
      paymentUrl: `/checkout/extension/${extension.id}`,
    };
  }

  /**
   * Mark booking as overdue
   */
  async markOverdue(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status !== BookingStatus.ACTIVE) {
      return null; // Already processed or completed
    }

    // Check if actually overdue (with grace period)
    const overdueThreshold = addMinutes(booking.endAt, this.gracePeriodMinutes);
    if (isBefore(new Date(), overdueThreshold)) {
      return null; // Still within grace period
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.OVERDUE },
    });

    // Send overdue notification
    await this.notificationService.sendOverdueWarning(booking);

    // Create incident if significantly overdue
    const hoursOverdue = differenceInMinutes(new Date(), booking.endAt) / 60;
    if (hoursOverdue > 24) {
      await this.prisma.incident.create({
        data: {
          type: 'OVERDUE_CRITICAL',
          severity: 'P2',
          status: 'OPEN',
          title: `Critical overdue: ${booking.bookingNumber}`,
          description: `Booking is ${Math.floor(hoursOverdue)} hours overdue`,
          bookingId,
          createdBy: 'SYSTEM',
        },
      });
    }

    return updated;
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        product: { include: { images: { where: { isPrimary: true } } } },
        compartment: {
          include: { locker: { include: { location: true } } },
        },
        user: true,
        payments: true,
        contract: true,
        returnRecord: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Non-admin users can only see their own bookings
    if (userId && booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    status?: BookingStatus[],
    page = 1,
    perPage = 20
  ) {
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status && { status: { in: status } }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          product: { include: { images: { where: { isPrimary: true } } } },
          compartment: {
            include: { locker: { include: { location: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      pagination: {
        page,
        perPage,
        totalItems: total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page * perPage < total,
        hasPrevious: page > 1,
      },
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private calculatePricing(
    hourlyRate: Prisma.Decimal,
    dailyRate: Prisma.Decimal,
    depositAmount: Prisma.Decimal,
    startAt: Date,
    endAt: Date
  ) {
    const hours = differenceInMinutes(endAt, startAt) / 60;
    const days = Math.ceil(hours / 24);

    const hourlyTotal = Math.ceil(hours) * Number(hourlyRate);
    const dailyTotal = days * Number(dailyRate);

    // Use cheaper option
    const subtotal = Math.min(hourlyTotal, dailyTotal);
    const taxRate = 0.2; // 20% VAT
    const taxAmount = subtotal * taxRate;
    const deposit = Number(depositAmount);
    const total = subtotal + taxAmount + deposit;

    return {
      subtotal,
      taxAmount,
      deposit,
      total,
      method: hourlyTotal <= dailyTotal ? 'hourly' : 'daily',
    };
  }

  private generateAccessPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
      },
    });
  }
}
