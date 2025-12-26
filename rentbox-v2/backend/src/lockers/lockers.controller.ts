import { Controller, Get, Post, Param, UseGuards, Request, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LockersService } from './lockers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('lockers')
@Controller('lockers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Get(':lockerId')
  @ApiOperation({ summary: 'Get locker status' })
  async getLockerStatus(@Param('lockerId') lockerId: string) {
    return this.lockersService.getLockerStatus(lockerId);
  }

  @Post(':lockerId/compartments/:compartmentId/open')
  @ApiOperation({ summary: 'Open compartment' })
  async openCompartment(
    @Request() req,
    @Param('lockerId') lockerId: string,
    @Param('compartmentId') compartmentId: string,
    @Ip() ipAddress: string,
  ) {
    // Note: This endpoint would need bookingId in body or derive from active booking
    // Simplified for now
    return this.lockersService.openCompartment(compartmentId, req.user.id, ipAddress);
  }
}
