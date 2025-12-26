import { Injectable } from '@nestjs/common';

interface CartItem {
  productId: string;
  compartmentId: string;
  startAt: string;
  endAt: string;
}

// In-memory cart store (use Redis in production)
const carts = new Map<string, CartItem[]>();

@Injectable()
export class CartService {
  getCart(cartId: string): CartItem[] {
    return carts.get(cartId) || [];
  }

  addToCart(cartId: string, item: CartItem) {
    const cart = this.getCart(cartId);
    cart.push(item);
    carts.set(cartId, cart);
    return cart;
  }

  clearCart(cartId: string) {
    carts.delete(cartId);
    return [];
  }
}
