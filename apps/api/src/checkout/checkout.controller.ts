import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@Controller('api/checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post('apply-code')
  async applyCode(@Body() body: { code: string }) {
    const result = await this.checkoutService.applyCode(body.code);
    return result || { error: 'Invalid code' };
  }

  @Post('remove-code')
  async removeCode(@Body() body: { code: string }) {
    return this.checkoutService.removeCode(body.code);
  }
}
