import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { BookingsModule } from './bookings/bookings.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    SystemModule,
    ProductsModule,
    CartModule,
    CheckoutModule,
    BookingsModule,
    AdminModule,
  ],
})
export class AppModule {}
