import { Module } from '@nestjs/common';
import { LockersService } from './lockers.service';
import { LockersController } from './lockers.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [BookingsModule, MqttModule],
  controllers: [LockersController],
  providers: [LockersService],
  exports: [LockersService],
})
export class LockersModule {}
