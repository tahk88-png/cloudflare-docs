import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('api/bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post('quote')
  async quote(@Body() body: { productId: string; compartmentId: string; startAt: string; endAt: string }) {
    return this.bookingsService.quote(body);
  }

  @Post()
  async create(@Body() body: { productId: string; compartmentId: string; startAt: string; endAt: string }) {
    return this.bookingsService.create(body);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(id);
  }

  @Post(':id/extend')
  async extend(@Param('id') id: string, @Body() body: { endAt: string }) {
    return this.bookingsService.extend(id, body.endAt);
  }
}
