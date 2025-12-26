import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';

// Database
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { BookingModule } from './modules/booking/booking.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { LockerModule } from './modules/locker/locker.module';
import { ReturnModule } from './modules/return/return.module';
import { NotificationModule } from './modules/notification/notification.module';
import { IncidentModule } from './modules/incident/incident.module';
import { ContentModule } from './modules/content/content.module';
import { SeoModule } from './modules/seo/seo.module';

// Configuration
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          ttl: 60000, // 1 minute
          limit: config.get<number>('RATE_LIMIT_DEFAULT') || 100,
        },
      ]),
    }),

    // Background job scheduling
    ScheduleModule.forRoot(),

    // Bull queue for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
          password: config.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    UserModule,
    CatalogModule,
    BookingModule,
    CalendarModule,
    CheckoutModule,
    LockerModule,
    ReturnModule,
    NotificationModule,
    IncidentModule,
    ContentModule,
    SeoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
