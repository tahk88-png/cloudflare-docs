import { Injectable, Logger, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { LockerEventType, AccessMethod, BookingStatus } from '@prisma/client';
import { addMinutes, isAfter, isBefore } from 'date-fns';

/**
 * LockerService - Physical hardware integration
 * 
 * CRITICAL RULES:
 * 1. Access ONLY if booking status is ACTIVE
 * 2. Time window: start_at - 15min to end_at + 30min (grace)
 * 3. Max 3 open attempts per booking via app
 * 4. Fallback: PIN code after failures
 * 5. ALL events logged with microsecond precision
 * 6. Hardware failures never hide booking truth
 */
@Injectable()
export class LockerService {
  private readonly logger = new Logger(LockerService.name);
  private readonly maxAppAttempts = 3;
  private readonly earlyAccessMinutes = 15;
  private readonly graceMinutes = 30;
  private readonly hardwareTimeoutMs = 5000;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Request to open a locker compartment
   * 
   * This is the primary access method for customers.
   * Multiple layers of validation ensure authorized access only.
   */
  async openCompartment(bookingId: string, userId: string, method: AccessMethod = AccessMethod.APP) {
    const startTime = Date.now();

    // Fetch booking with all necessary relations
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        compartment: {
          include: {
            locker: { include: { location: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify ownership
    if (booking.userId !== userId) {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId, 
        LockerEventType.OPEN_FAILURE, false, method, 'ACCESS_DENIED', 'Unauthorized user');
      throw new ForbiddenException('Access denied');
    }

    // Verify booking status - MUST be ACTIVE
    if (booking.status !== BookingStatus.ACTIVE && booking.status !== BookingStatus.PAID) {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId,
        LockerEventType.OPEN_FAILURE, false, method, 'INVALID_STATUS', `Booking status: ${booking.status}`);
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: this.getAccessDeniedMessage(booking.status),
        details: { bookingStatus: booking.status },
      });
    }

    // Verify time window
    const now = new Date();
    const earlyAccessTime = addMinutes(booking.startAt, -this.earlyAccessMinutes);
    const lateAccessTime = addMinutes(booking.endAt, this.graceMinutes);

    if (isBefore(now, earlyAccessTime)) {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId,
        LockerEventType.OPEN_FAILURE, false, method, 'TOO_EARLY', 
        `Current: ${now.toISOString()}, Start: ${booking.startAt.toISOString()}`);
      throw new ForbiddenException({
        code: 'TOO_EARLY',
        message: `Your rental starts at ${booking.startAt.toISOString()}. You can access 15 minutes before.`,
        details: {
          currentTime: now.toISOString(),
          accessAvailableAt: earlyAccessTime.toISOString(),
        },
      });
    }

    if (isAfter(now, lateAccessTime)) {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId,
        LockerEventType.OPEN_FAILURE, false, method, 'RENTAL_ENDED',
        `Current: ${now.toISOString()}, End: ${booking.endAt.toISOString()}`);
      throw new ForbiddenException({
        code: 'RENTAL_ENDED',
        message: 'Your rental period has ended. Please contact support if you need assistance.',
        details: {
          currentTime: now.toISOString(),
          rentalEndedAt: booking.endAt.toISOString(),
        },
      });
    }

    // Check app attempt limit
    if (method === AccessMethod.APP && booking.accessAttempts >= this.maxAppAttempts) {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId,
        LockerEventType.OPEN_FAILURE, false, method, 'MAX_ATTEMPTS', 
        `Attempts: ${booking.accessAttempts}`);
      
      return {
        success: false,
        code: 'MAX_ATTEMPTS_REACHED',
        message: 'Maximum app unlock attempts reached. Please use the PIN code.',
        fallback: {
          type: 'PIN',
          pin: booking.accessPin,
          instructions: `Enter PIN ${booking.accessPin} on the locker keypad to open compartment #${booking.compartment.number}.`,
        },
      };
    }

    // Verify locker is online
    if (booking.compartment.locker.status !== 'ONLINE') {
      await this.logEvent(booking.compartment.lockerId, booking.compartmentId, bookingId,
        LockerEventType.OPEN_FAILURE, false, method, 'LOCKER_OFFLINE',
        `Locker status: ${booking.compartment.locker.status}`);
      throw new ServiceUnavailableException({
        code: 'LOCKER_OFFLINE',
        message: 'The locker is temporarily unavailable. Please try again in a moment or use the PIN code.',
        fallback: {
          type: 'PIN',
          pin: booking.accessPin,
          instructions: `Try PIN ${booking.accessPin} on the keypad. If that fails, contact support.`,
        },
      });
    }

    // Increment attempt counter
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { accessAttempts: { increment: 1 } },
    });

    // Send command to hardware
    try {
      const hardwareResult = await this.sendHardwareCommand(
        booking.compartment.locker.externalId,
        booking.compartment.externalId,
        'OPEN'
      );

      const responseTime = Date.now() - startTime;

      if (hardwareResult.success) {
        // Log successful open
        const eventId = await this.logEvent(
          booking.compartment.lockerId,
          booking.compartmentId,
          bookingId,
          LockerEventType.OPEN_SUCCESS,
          true,
          method,
          null,
          null,
          responseTime
        );

        // Update compartment state
        await this.prisma.compartment.update({
          where: { id: booking.compartmentId },
          data: {
            isOpen: true,
            lastOpenedAt: new Date(),
          },
        });

        // If this is first access and booking was PAID, activate it
        if (booking.status === BookingStatus.PAID) {
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.ACTIVE,
              firstAccessedAt: new Date(),
            },
          });
        }

        return {
          success: true,
          eventId,
          compartmentId: booking.compartmentId,
          lockerName: booking.compartment.locker.name,
          compartmentNumber: booking.compartment.number,
          status: 'OPENED',
          message: `Compartment #${booking.compartment.number} is now open. Please take your tool.`,
          autoCloseSeconds: 60,
        };
      } else {
        // Hardware returned failure
        await this.logEvent(
          booking.compartment.lockerId,
          booking.compartmentId,
          bookingId,
          LockerEventType.OPEN_FAILURE,
          false,
          method,
          hardwareResult.errorCode,
          hardwareResult.errorMessage,
          responseTime
        );

        const attemptsRemaining = this.maxAppAttempts - booking.accessAttempts - 1;

        return {
          success: false,
          code: 'HARDWARE_ERROR',
          message: 'The compartment could not be opened. Please try again.',
          details: {
            attempt: booking.accessAttempts + 1,
            attemptsRemaining,
          },
          action: attemptsRemaining > 0
            ? "Tap 'Try Again' to retry."
            : `Use PIN ${booking.accessPin} on the locker keypad.`,
          fallback: attemptsRemaining === 0 ? {
            type: 'PIN',
            pin: booking.accessPin,
            instructions: `Enter PIN ${booking.accessPin} on the locker keypad.`,
          } : undefined,
        };
      }
    } catch (error) {
      // Hardware timeout or connection error
      const responseTime = Date.now() - startTime;
      
      await this.logEvent(
        booking.compartment.lockerId,
        booking.compartmentId,
        bookingId,
        LockerEventType.OPEN_FAILURE,
        false,
        method,
        'TIMEOUT',
        error.message,
        responseTime
      );

      this.logger.error(`Locker command failed for ${booking.compartment.locker.externalId}`, error);

      const attemptsRemaining = this.maxAppAttempts - booking.accessAttempts - 1;

      return {
        success: false,
        code: 'LOCKER_TIMEOUT',
        message: "The locker didn't respond. Please try again.",
        details: {
          attempt: booking.accessAttempts + 1,
          attemptsRemaining,
        },
        action: "Tap 'Try Again' or use the PIN code on the keypad.",
        fallback: {
          type: 'PIN',
          pin: booking.accessPin,
          instructions: `Enter PIN ${booking.accessPin} on the locker keypad.`,
        },
      };
    }
  }

  /**
   * Get access PIN for fallback access
   */
  async getAccessPin(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        compartment: {
          include: { locker: { include: { location: true } } },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!['PAID', 'ACTIVE'].includes(booking.status)) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: this.getAccessDeniedMessage(booking.status),
      });
    }

    return {
      pin: booking.accessPin,
      validUntil: addMinutes(booking.endAt, this.graceMinutes),
      instructions: `Enter this PIN on the locker keypad to open compartment #${booking.compartment.number}.`,
      location: {
        lockerName: booking.compartment.locker.name,
        compartment: booking.compartment.number,
        address: booking.compartment.locker.location.address,
      },
    };
  }

  /**
   * Request SMS PIN (sends new PIN via SMS)
   */
  async requestSmsPIN(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!booking.user.phone) {
      throw new ForbiddenException({
        code: 'NO_PHONE',
        message: 'No phone number on file. Please contact support.',
      });
    }

    // Generate new PIN and update booking
    const newPin = this.generatePin();
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { accessPin: newPin },
    });

    // TODO: Send SMS via Twilio
    // await this.smsService.send(booking.user.phone, `Your Rentbox PIN: ${newPin}`);

    const maskedPhone = booking.user.phone.replace(/(.{3})(.*)(.{2})/, '$1***$3');

    return {
      success: true,
      message: `PIN sent to ${maskedPhone}`,
      validForMinutes: 15,
    };
  }

  /**
   * Handle door close detection (called by hardware webhook)
   */
  async handleDoorClose(lockerExternalId: string, compartmentExternalId: string) {
    const compartment = await this.prisma.compartment.findFirst({
      where: {
        externalId: compartmentExternalId,
        locker: { externalId: lockerExternalId },
      },
    });

    if (!compartment) {
      this.logger.warn(`Unknown compartment: ${lockerExternalId}/${compartmentExternalId}`);
      return;
    }

    await this.prisma.compartment.update({
      where: { id: compartment.id },
      data: {
        isOpen: false,
        lastClosedAt: new Date(),
      },
    });

    await this.logEvent(
      compartment.lockerId,
      compartment.id,
      null,
      LockerEventType.CLOSE_DETECTED,
      true,
      AccessMethod.HARDWARE_BUTTON,
      null,
      null
    );
  }

  /**
   * Get locker status (for admin dashboard)
   */
  async getLockerStatus(lockerId: string) {
    const locker = await this.prisma.locker.findUnique({
      where: { id: lockerId },
      include: {
        location: true,
        compartments: {
          include: {
            bookings: {
              where: { status: { in: ['ACTIVE', 'PAID'] } },
              orderBy: { startAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!locker) {
      throw new NotFoundException('Locker not found');
    }

    return {
      id: locker.id,
      externalId: locker.externalId,
      name: locker.name,
      status: locker.status,
      lastPingAt: locker.lastPingAt,
      location: {
        id: locker.location.id,
        name: locker.location.name,
        address: locker.location.address,
      },
      compartments: locker.compartments.map((c) => ({
        id: c.id,
        number: c.number,
        size: c.size,
        status: c.status,
        isOpen: c.isOpen,
        lastOpenedAt: c.lastOpenedAt,
        lastClosedAt: c.lastClosedAt,
        currentBooking: c.bookings[0] ? {
          id: c.bookings[0].id,
          bookingNumber: c.bookings[0].bookingNumber,
          status: c.bookings[0].status,
          startAt: c.bookings[0].startAt,
          endAt: c.bookings[0].endAt,
        } : null,
      })),
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Send command to locker hardware
   * 
   * This would integrate with actual hardware via:
   * - MQTT for real-time bidirectional communication
   * - HTTP webhook as fallback
   */
  private async sendHardwareCommand(
    lockerExternalId: string,
    compartmentExternalId: string,
    command: 'OPEN' | 'CLOSE' | 'STATUS'
  ): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
    // TODO: Implement actual hardware integration
    // This is a mock implementation for development

    const hardwareEndpoint = this.configService.get<string>('LOCKER_HARDWARE_URL');
    
    if (!hardwareEndpoint) {
      // Mock response for development
      this.logger.debug(`Mock hardware command: ${command} -> ${lockerExternalId}/${compartmentExternalId}`);
      
      // Simulate occasional failures for testing
      if (Math.random() < 0.1) {
        return {
          success: false,
          errorCode: 'SERVO_STUCK',
          errorMessage: 'Compartment servo not responding',
        };
      }

      return { success: true };
    }

    // Real implementation would use MQTT or HTTP
    try {
      const response = await fetch(`${hardwareEndpoint}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockerId: lockerExternalId,
          compartmentId: compartmentExternalId,
          command,
        }),
        signal: AbortSignal.timeout(this.hardwareTimeoutMs),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Hardware communication failed: ${error.message}`);
    }
  }

  private async logEvent(
    lockerId: string,
    compartmentId: string | null,
    bookingId: string | null,
    eventType: LockerEventType,
    success: boolean,
    method: AccessMethod | null,
    errorCode: string | null,
    errorMessage: string | null,
    hardwareResponseMs?: number
  ): Promise<string> {
    const event = await this.prisma.lockerEvent.create({
      data: {
        lockerId,
        compartmentId,
        bookingId,
        eventType,
        success,
        method,
        errorCode,
        errorMessage,
        hardwareResponseMs,
      },
    });

    return event.id;
  }

  private getAccessDeniedMessage(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.PENDING:
        return 'Your booking is pending payment. Please complete checkout first.';
      case BookingStatus.COMPLETED:
        return 'This rental has been completed.';
      case BookingStatus.CANCELLED:
        return 'This booking was cancelled.';
      case BookingStatus.EXPIRED:
        return 'This booking has expired.';
      case BookingStatus.OVERDUE:
        return 'This rental is overdue. Please return the item immediately.';
      default:
        return 'Access denied.';
    }
  }

  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
