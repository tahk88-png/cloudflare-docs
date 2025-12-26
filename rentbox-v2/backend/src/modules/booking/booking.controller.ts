import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { BookingStatus } from '@prisma/client';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  // ==================== AVAILABILITY ====================

  @Get('availability/:productId')
  @ApiOperation({ summary: 'Check availability for a product at a location' })
  @ApiResponse({ status: 200, description: 'Availability information returned' })
  async checkAvailability(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() dto: CheckAvailabilityDto,
  ) {
    const isAvailable = await this.availabilityService.checkAvailability(
      dto.compartmentId,
      new Date(dto.startAt),
      new Date(dto.endAt),
    );

    if (!isAvailable) {
      const alternatives = await this.availabilityService.findAlternatives(
        productId,
        dto.locationId,
        new Date(dto.startAt),
        new Date(dto.endAt),
      );

      return {
        isAvailable: false,
        productId,
        locationId: dto.locationId,
        requestedSlot: {
          startAt: dto.startAt,
          endAt: dto.endAt,
        },
        alternatives,
      };
    }

    return {
      isAvailable: true,
      productId,
      locationId: dto.locationId,
      requestedSlot: {
        startAt: dto.startAt,
        endAt: dto.endAt,
      },
    };
  }

  @Get('calendar/:productId')
  @ApiOperation({ summary: 'Get monthly availability calendar' })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'month', required: true, example: '2024-01' })
  async getCalendar(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('locationId', ParseUUIDPipe) locationId: string,
    @Query('month') month: string,
  ) {
    const [year, monthNum] = month.split('-').map(Number);
    return this.availabilityService.getAvailabilityCalendar(
      productId,
      locationId,
      year,
      monthNum,
    );
  }

  @Get('slots/:productId')
  @ApiOperation({ summary: 'Get available time slots for a specific day' })
  @ApiQuery({ name: 'locationId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15' })
  async getDaySlots(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('locationId', ParseUUIDPipe) locationId: string,
    @Query('date') dateStr: string,
  ) {
    const date = new Date(dateStr);
    return this.availabilityService.getDaySlots(productId, locationId, date);
  }

  // ==================== BOOKING CRUD ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 409, description: 'Slot unavailable or conflict' })
  async createBooking(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingService.createBooking(userId, dto, idempotencyKey);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiQuery({ name: 'status', required: false, isArray: true, enum: BookingStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  async getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: BookingStatus | BookingStatus[],
    @Query('page') page = 1,
    @Query('perPage') perPage = 20,
  ) {
    const statusArray = status
      ? Array.isArray(status)
        ? status
        : [status]
      : undefined;
    return this.bookingService.getUserBookings(userId, statusArray, page, perPage);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking details' })
  @ApiResponse({ status: 200, description: 'Booking details returned' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingService.getBooking(id, userId);
  }

  // ==================== BOOKING ACTIONS ====================

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 409, description: 'Cannot cancel - invalid state' })
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(id, userId, dto.reason);
  }

  @Post(':id/extend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request booking extension' })
  @ApiResponse({ status: 200, description: 'Extension request created' })
  @ApiResponse({ status: 409, description: 'Cannot extend - slot unavailable' })
  async extendBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ExtendBookingDto,
  ) {
    return this.bookingService.extendBooking(id, userId, dto);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate booking (start rental)' })
  @ApiResponse({ status: 200, description: 'Booking activated' })
  @ApiResponse({ status: 409, description: 'Cannot activate - invalid state or too early' })
  async activateBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    // Verify user owns the booking
    await this.bookingService.getBooking(id, userId);
    return this.bookingService.activateBooking(id);
  }
}
