import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AvailabilityService } from './availability.service';
import { BookingProcessor } from './booking.processor';
import { BookingScheduler } from './booking.scheduler';
import { DatabaseModule } from '../../database/database.module';
import { NotificationModule } from '../notification/notification.module';
import { LockerModule } from '../locker/locker.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationModule,
    LockerModule,
    BullModule.registerQueue({
      name: 'booking',
    }),
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    AvailabilityService,
    BookingProcessor,
    BookingScheduler,
  ],
  exports: [BookingService, AvailabilityService],
})
export class BookingModule {}
