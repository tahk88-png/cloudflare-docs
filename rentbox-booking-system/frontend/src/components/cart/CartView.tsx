// ═══════════════════════════════════════════════════════════════════════════
// CART VIEW COMPONENT
// Main cart page layout with items, summary, and checkout
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { CartItemCard } from './CartItemCard';
import { CartSummary } from './CartSummary';
import { PriceBreakdown } from './PriceBreakdown';
import { StickyCheckoutCTA } from './StickyCheckoutCTA';
import { TimeRangeEditor } from './TimeRangeEditor';
import { useCartStore, initializeCart } from '../../store/cart-store';
import type { CartItem } from '../../types';

interface CartViewProps {
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onCheckout,
  onContinueShopping,
}) => {
  const {
    cart,
    isLoading,
    error,
    validationResult,
    removeItem,
    updateItem,
    validateCart,
    clearError,
    clearCart,
  } = useCartStore();

  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize cart on mount
  useEffect(() => {
    initializeCart();
  }, []);

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleUpdateItem = async (startAt: string, endAt: string) => {
    if (!editingItem) return;
    await updateItem(editingItem.id, startAt, endAt);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateCart();
    } finally {
      setIsValidating(false);
    }
  };

  const handleCartExpire = () => {
    clearCart();
  };

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h1>
          <p className="text-gray-600 mb-6">
            Browse our tools and add some items to your cart to get started.
          </p>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Package className="w-5 h-5" />}
            onClick={onContinueShopping}
          >
            Browse Tools
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onContinueShopping}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Your Cart</h1>
              <p className="text-sm text-gray-500">
                {cart.summary.items_count} item{cart.summary.items_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-50 border-b border-danger-100 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-danger-600 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-danger-600 hover:text-danger-700 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart items (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onRemove={handleRemoveItem}
                onEdit={() => setEditingItem(item)}
                isRemoving={removingItemId === item.id}
              />
            ))}

            {/* Continue shopping */}
            <div className="pt-4">
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={onContinueShopping}
              >
                Continue Shopping
              </Button>
            </div>
          </div>

          {/* Sidebar (1 column) - Desktop only */}
          <div className="hidden lg:block space-y-6">
            <CartSummary
              cart={cart}
              validationResult={validationResult}
              onCheckout={onCheckout}
              onValidate={handleValidate}
              isValidating={isValidating}
              onCartExpire={handleCartExpire}
            />

            <PriceBreakdown
              items={cart.items}
              summary={cart.summary}
            />
          </div>
        </div>
      </main>

      {/* Mobile sticky checkout */}
      <StickyCheckoutCTA
        summary={cart.summary}
        expiresInSeconds={cart.expires_in_seconds}
        validationResult={validationResult}
        onCheckout={onCheckout}
        onCartExpire={handleCartExpire}
      />

      {/* Time range editor modal */}
      {editingItem && (
        <TimeRangeEditor
          item={editingItem}
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
