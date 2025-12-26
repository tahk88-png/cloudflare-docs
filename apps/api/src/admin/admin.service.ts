import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        product: true,
        compartment: true,
        locker: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIncidents() {
    return this.prisma.incident.findMany({
      include: {
        locker: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveIncident(id: string) {
    return this.prisma.incident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  async loadDemo() {
    // Trigger demo load script
    const { exec } = require('child_process');
    const path = require('path');
    return new Promise((resolve, reject) => {
      const rootDir = path.resolve(__dirname, '../../../../');
      exec('pnpm demo:load', { cwd: rootDir }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject({ error: error.message, stderr });
        } else {
          resolve({ success: true, stdout });
        }
      });
    });
  }

  async resetDemo() {
    const { exec } = require('child_process');
    const path = require('path');
    return new Promise((resolve, reject) => {
      const rootDir = path.resolve(__dirname, '../../../../');
      exec('pnpm demo:reset', { cwd: rootDir }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject({ error: error.message, stderr });
        } else {
          resolve({ success: true, stdout });
        }
      });
    });
  }
}
