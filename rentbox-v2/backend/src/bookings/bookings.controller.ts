import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 409, description: 'Compartment not available' })
  async create(@Request() req, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user bookings' })
  async findAll(@Request() req) {
    return this.bookingsService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.bookingsService.findOne(id, req.user.id);
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend booking duration' })
  async extend(@Request() req, @Param('id') id: string, @Body() dto: ExtendBookingDto) {
    return this.bookingsService.extend(id, req.user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel booking' })
  async cancel(@Request() req, @Param('id') id: string) {
    return this.bookingsService.cancel(id, req.user.id);
  }

  @Post('availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check compartment availability' })
  async checkAvailability(@Body() dto: { compartmentId: string; startAt: string; endAt: string }) {
    return this.bookingsService.checkAvailability(
      dto.compartmentId,
      new Date(dto.startAt),
      new Date(dto.endAt),
    );
  }
}
