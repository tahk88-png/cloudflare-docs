import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Get availability slots' })
  async getAvailability(
    @Query('compartment_id') compartmentId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.calendarService.getAvailability(
      compartmentId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('next-available/:compartmentId')
  @ApiOperation({ summary: 'Find next available slot' })
  async findNextAvailable(
    @Param('compartmentId') compartmentId: string,
    @Query('duration_hours') durationHours: string,
  ) {
    return this.calendarService.findNextAvailable(compartmentId, parseInt(durationHours, 10));
  }
}
