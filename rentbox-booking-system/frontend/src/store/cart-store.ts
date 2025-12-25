// ═══════════════════════════════════════════════════════════════════════════
// CART STORE (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, ValidationResult } from '../types';
import { cartApi, checkoutApi } from '../services/api';

interface CartState {
  // State
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  validationResult: ValidationResult | null;
  checkoutInProgress: boolean;

  // Actions
  createCart: () => Promise<Cart>;
  loadCart: (cartId: string) => Promise<void>;
  addItem: (productId: string, startAt: string, endAt: string) => Promise<void>;
  updateItem: (itemId: string, startAt?: string, endAt?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  validateCart: () => Promise<ValidationResult>;
  initiateCheckout: (returnUrl: string, email?: string) => Promise<{ clientSecret: string; paymentIntentId: string }>;
  confirmPayment: (paymentIntentId: string) => Promise<void>;
  clearCart: () => void;
  clearError: () => void;
}

const CART_ID_KEY = 'rentbox_cart_id';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      cart: null,
      isLoading: false,
      error: null,
      validationResult: null,
      checkoutInProgress: false,

      // Create a new cart
      createCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartApi.create();
          localStorage.setItem(CART_ID_KEY, cart.id);
          set({ cart, isLoading: false });
          return cart;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create cart';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Load existing cart
      loadCart: async (cartId: string) => {
        set({ isLoading: true, error: null });
        try {
          const cart = await cartApi.get(cartId);
          set({ cart, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load cart';
          set({ error: message, isLoading: false, cart: null });
          localStorage.removeItem(CART_ID_KEY);
        }
      },

      // Add item to cart
      addItem: async (productId: string, startAt: string, endAt: string) => {
        const { cart } = get();
        
        // Create cart if doesn't exist
        let cartId = cart?.id;
        if (!cartId) {
          const newCart = await get().createCart();
          cartId = newCart.id;
        }

        set({ isLoading: true, error: null });
        try {
          const updatedCart = await cartApi.addItem(cartId, {
            product_id: productId,
            start_at: startAt,
            end_at: endAt,
          });
          set({ cart: updatedCart, isLoading: false, validationResult: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Update cart item
      updateItem: async (itemId: string, startAt?: string, endAt?: string) => {
        const { cart } = get();
        if (!cart) return;

        set({ isLoading: true, error: null });
        try {
          const updatedCart = await cartApi.updateItem(cart.id, itemId, {
            start_at: startAt,
            end_at: endAt,
          });
          set({ cart: updatedCart, isLoading: false, validationResult: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Remove item from cart
      removeItem: async (itemId: string) => {
        const { cart } = get();
        if (!cart) return;

        set({ isLoading: true, error: null });
        try {
          const updatedCart = await cartApi.removeItem(cart.id, itemId);
          set({ cart: updatedCart, isLoading: false, validationResult: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove item';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Validate cart before checkout
      validateCart: async () => {
        const { cart } = get();
        if (!cart) throw new Error('No cart to validate');

        set({ isLoading: true, error: null });
        try {
          const result = await cartApi.validate(cart.id);
          set({ validationResult: result, isLoading: false });
          
          // Reload cart if items were recalculated
          if (result.recalculated_items) {
            const updatedCart = await cartApi.get(cart.id);
            set({ cart: updatedCart });
          }
          
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Validation failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Initiate checkout
      initiateCheckout: async (returnUrl: string, email?: string) => {
        const { cart } = get();
        if (!cart) throw new Error('No cart to checkout');

        set({ checkoutInProgress: true, error: null });
        try {
          const result = await checkoutApi.initiate(cart.id, {
            return_url: returnUrl,
            customer_email: email,
          });
          return {
            clientSecret: result.client_secret,
            paymentIntentId: result.payment_intent_id,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Checkout failed';
          set({ error: message, checkoutInProgress: false });
          throw error;
        }
      },

      // Confirm payment
      confirmPayment: async (paymentIntentId: string) => {
        const { cart } = get();
        if (!cart) throw new Error('No cart');

        try {
          await checkoutApi.confirmPayment(cart.id, paymentIntentId);
          // Clear cart after successful payment
          get().clearCart();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Payment confirmation failed';
          set({ error: message, checkoutInProgress: false });
          throw error;
        }
      },

      // Clear cart
      clearCart: () => {
        localStorage.removeItem(CART_ID_KEY);
        set({
          cart: null,
          validationResult: null,
          checkoutInProgress: false,
          error: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'rentbox-cart',
      partialize: (state) => ({}), // Don't persist anything, we use localStorage for cart ID
    }
  )
);

// Initialize cart from localStorage on app load
export function initializeCart() {
  const cartId = localStorage.getItem(CART_ID_KEY);
  if (cartId) {
    useCartStore.getState().loadCart(cartId);
  }
}
