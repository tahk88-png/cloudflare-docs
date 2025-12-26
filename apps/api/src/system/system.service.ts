import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getHealth() {
    const services: Record<string, string> = {};

    // Check DB
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.db = 'ok';
    } catch {
      services.db = 'down';
    }

    // Check Redis (stub)
    services.redis = 'ok';

    // Stub other services
    services.sms = 'ok';
    services.payments = 'degraded';
    services.locker = 'ok';

    const overall = Object.values(services).every(s => s === 'ok')
      ? 'ok'
      : Object.values(services).some(s => s === 'down')
      ? 'down'
      : 'degraded';

    return { overall, services };
  }

  async getFlags() {
    const flags = await this.prisma.systemFlag.findMany();
    const flagMap: Record<string, boolean> = {};

    flags.forEach(flag => {
      flagMap[flag.key] = flag.enabled;
    });

    // Default flags if DB is empty
    if (flags.length === 0) {
      return {
        checkout_enabled: true,
        maintenance_mode: false,
        new_registrations: true,
        sms_notifications: true,
        email_notifications: true,
        payment_gateway_live: false,
      };
    }

    return flagMap;
  }

  async updateFlag(key: string, enabled: boolean) {
    return this.prisma.systemFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled },
    });
  }
}
