import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('bookings')
  async getBookings() {
    return this.adminService.getBookings();
  }

  @Get('incidents')
  async getIncidents() {
    return this.adminService.getIncidents();
  }

  @Post('incidents/:id/resolve')
  async resolveIncident(@Param('id') id: string) {
    return this.adminService.resolveIncident(id);
  }

  @Post('demo/load')
  async loadDemo() {
    return this.adminService.loadDemo();
  }

  @Post('demo/reset')
  async resetDemo() {
    return this.adminService.resetDemo();
  }
}
