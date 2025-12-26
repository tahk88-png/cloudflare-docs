import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Rentbox v2 API')
      .setDescription('Self-service tool rental platform API')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('products', 'Product catalog')
      .addTag('bookings', 'Booking management')
      .addTag('calendar', 'Availability calendar')
      .addTag('checkout', 'Checkout and payments')
      .addTag('lockers', 'Locker access')
      .addTag('returns', 'Return processing')
      .addTag('incidents', 'Incident management')
      .build();
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  
  console.log(`🚀 Rentbox v2 API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();
