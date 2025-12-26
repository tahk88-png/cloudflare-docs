import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from '../mqtt/mqtt.service';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class LockersService {
  constructor(
    private prisma: PrismaService,
    private mqtt: MqttService,
    private bookings: BookingsService,
  ) {}

  /**
   * Open compartment for active booking
   */
  async openCompartment(bookingId: string, userId: string, ipAddress?: string) {
    // Verify booking exists and belongs to user
    const booking = await this.bookings.findOne(bookingId, userId);

    // Check booking is active
    if (booking.status !== 'active') {
      throw new ForbiddenException('Booking is not active');
    }

    // Check booking has started
    const now = new Date();
    if (now < booking.startAt) {
      throw new BadRequestException('Booking has not started yet');
    }

    const compartment = await this.prisma.compartment.findUnique({
      where: { id: booking.compartmentId },
      include: { locker: true },
    });

    if (!compartment) {
      throw new NotFoundException('Compartment not found');
    }

    // Attempt to open via MQTT
    let result = 'failure';
    let method = 'mqtt';
    let metadata: any = {};

    try {
      const mqttResult = await this.mqtt.openCompartment(
        compartment.locker.mqttTopic,
        compartment.number,
      );
      result = mqttResult.success ? 'success' : 'failure';
      metadata = mqttResult;
    } catch (error) {
      // Fallback to PIN code via SMS
      method = 'sms';
      // TODO: Send PIN code via SMS
      // For now, log the attempt
      metadata = { error: error.message };
    }

    // Log access event (always, regardless of success/failure)
    await this.prisma.accessEvent.create({
      data: {
        bookingId,
        compartmentId: compartment.id,
        action: 'open',
        result,
        method,
        ipAddress,
        metadata,
      },
    });

    if (result === 'failure') {
      // Create incident if hardware failure
      await this.prisma.incident.create({
        data: {
          type: 'access_failure',
          severity: 'high',
          bookingId,
          lockerId: compartment.lockerId,
          compartmentId: compartment.id,
          description: `Failed to open compartment ${compartment.number} for booking ${bookingId}`,
          status: 'open',
        },
      });

      throw new BadRequestException('Failed to open compartment. Support has been notified.');
    }

    return {
      success: true,
      method,
      eventId: bookingId,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Get locker status
   */
  async getLockerStatus(lockerId: string) {
    const locker = await this.prisma.locker.findUnique({
      where: { id: lockerId },
      include: {
        compartments: {
          include: {
            productLocations: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!locker) {
      throw new NotFoundException('Locker not found');
    }

    return locker;
  }
}
