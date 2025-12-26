import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('api/system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('health')
  async getHealth() {
    return this.systemService.getHealth();
  }

  @Get('flags')
  async getFlags() {
    return this.systemService.getFlags();
  }

  @Post('flags')
  @UseGuards(AdminGuard)
  async updateFlag(@Body() body: { key: string; enabled: boolean }) {
    return this.systemService.updateFlag(body.key, body.enabled);
  }
}
