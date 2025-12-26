import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async quote(data: { productId: string; compartmentId: string; startAt: string; endAt: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const pricing = product.pricing as any;
    let price = 0;

    if (hours >= 24 * 7) {
      const weeks = Math.floor(hours / (24 * 7));
      price += weeks * pricing.weekly;
      const remainingHours = hours % (24 * 7);
      if (remainingHours >= 24) {
        const days = Math.floor(remainingHours / 24);
        price += days * pricing.daily;
        price += (remainingHours % 24) * pricing.hourly;
      } else {
        price += remainingHours * pricing.hourly;
      }
    } else if (hours >= 24) {
      const days = Math.floor(hours / 24);
      price += days * pricing.daily;
      price += (hours % 24) * pricing.hourly;
    } else {
      price = hours * pricing.hourly;
    }

    return {
      productId: product.id,
      productName: product.name,
      startAt: data.startAt,
      endAt: data.endAt,
      durationHours: hours,
      price,
      deposit: product.deposit,
      total: price + Number(product.deposit),
    };
  }

  async create(data: { productId: string; compartmentId: string; startAt: string; endAt: string }) {
    const compartment = await this.prisma.compartment.findUnique({
      where: { id: data.compartmentId },
      include: { locker: true },
    });

    if (!compartment) {
      throw new Error('Compartment not found');
    }

    return this.prisma.booking.create({
      data: {
        productId: data.productId,
        compartmentId: data.compartmentId,
        lockerId: compartment.lockerId,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        status: 'PENDING',
      },
    });
  }

  async cancel(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async extend(id: string, newEndAt: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { endAt: new Date(newEndAt) },
    });
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        product: true,
        compartment: true,
        locker: true,
      },
      orderBy: { startAt: 'desc' },
    });
  }
}
