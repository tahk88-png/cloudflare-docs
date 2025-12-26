import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService) {}

  async applyCode(code: string) {
    // Check discount code
    const discount = await this.prisma.discountCode.findUnique({
      where: { code },
    });

    if (discount) {
      return { type: 'discount', code: discount.code, value: discount.value, typeValue: discount.type };
    }

    // Check voucher
    const voucher = await this.prisma.voucher.findUnique({
      where: { code },
    });

    if (voucher && voucher.remaining > 0 && (!voucher.expires || voucher.expires > new Date())) {
      return { type: 'voucher', code: voucher.code, value: voucher.remaining };
    }

    return null;
  }

  async removeCode(code: string) {
    return { success: true };
  }
}
