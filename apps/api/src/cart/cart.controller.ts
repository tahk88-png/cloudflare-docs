import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('api/cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get(':id')
  getCart(@Param('id') id: string) {
    return { items: this.cartService.getCart(id) };
  }

  @Post('add')
  addToCart(@Body() body: { cartId: string; productId: string; compartmentId: string; startAt: string; endAt: string }) {
    const cart = this.cartService.addToCart(body.cartId, {
      productId: body.productId,
      compartmentId: body.compartmentId,
      startAt: body.startAt,
      endAt: body.endAt,
    });
    return { items: cart };
  }
}
