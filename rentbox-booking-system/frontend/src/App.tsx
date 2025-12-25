// ═══════════════════════════════════════════════════════════════════════════
// RENTBOX - MAIN APP COMPONENT
// Demo application showcasing the booking cart and checkout system
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  Plus,
  Calendar,
  MapPin,
  Star
} from 'lucide-react';
import { Button } from './components/ui/Button';
import { CartView } from './components/cart/CartView';
import { CheckoutView } from './components/checkout/CheckoutView';
import { CheckoutSuccess } from './components/checkout/CheckoutSuccess';
import { useCartStore, initializeCart } from './store/cart-store';
import { formatCurrency } from './utils/format';
import type { Booking } from './types';
import { cn } from './utils/cn';

// Demo products
const DEMO_PRODUCTS = [
  {
    id: 'prod_1',
    name: 'Bosch Professional Hammer Drill',
    category: 'power-tools',
    base_price_per_hour: 3.50,
    base_price_per_day: 15.00,
    deposit_amount: 50.00,
    image_url: null,
    rating: 4.8,
  },
  {
    id: 'prod_2',
    name: 'Makita Circular Saw',
    category: 'power-tools',
    base_price_per_hour: 4.00,
    base_price_per_day: 18.00,
    deposit_amount: 60.00,
    image_url: null,
    rating: 4.9,
  },
  {
    id: 'prod_3',
    name: 'Kärcher Pressure Washer K5',
    category: 'cleaning',
    base_price_per_hour: 5.00,
    base_price_per_day: 25.00,
    deposit_amount: 80.00,
    image_url: null,
    rating: 4.7,
  },
  {
    id: 'prod_4',
    name: 'DeWalt Angle Grinder',
    category: 'power-tools',
    base_price_per_hour: 2.50,
    base_price_per_day: 12.00,
    deposit_amount: 40.00,
    image_url: null,
    rating: 4.6,
  },
];

type View = 'products' | 'cart' | 'checkout' | 'success';

function App() {
  const [currentView, setCurrentView] = useState<View>('products');
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const { cart, addItem, isLoading, error } = useCartStore();

  // Initialize cart on mount
  useEffect(() => {
    initializeCart();
  }, []);

  const handleAddToCart = async (productId: string) => {
    const startAt = new Date();
    startAt.setHours(startAt.getHours() + 2);
    startAt.setMinutes(0, 0, 0);

    const endAt = new Date(startAt);
    endAt.setHours(endAt.getHours() + 4);

    try {
      await addItem(productId, startAt.toISOString(), endAt.toISOString());
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleCheckoutSuccess = (bookings: Booking[]) => {
    setCompletedBookings(bookings);
    setCurrentView('success');
  };

  const cartItemCount = cart?.items.length || 0;

  // Render based on current view
  if (currentView === 'cart') {
    return (
      <CartView
        onCheckout={() => setCurrentView('checkout')}
        onContinueShopping={() => setCurrentView('products')}
      />
    );
  }

  if (currentView === 'checkout') {
    return (
      <CheckoutView
        onBack={() => setCurrentView('cart')}
        onSuccess={handleCheckoutSuccess}
      />
    );
  }

  if (currentView === 'success') {
    return (
      <CheckoutSuccess
        bookings={completedBookings}
        onViewBookings={() => setCurrentView('products')}
        onContinueShopping={() => setCurrentView('products')}
      />
    );
  }

  // Products view (default)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Rentbox</h1>
                <p className="text-xs text-gray-500">24/7 Tool Rental</p>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentView('cart')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-2">Professional Tools, On Demand</h2>
          <p className="text-primary-100 mb-6">
            Rent quality tools from our 24/7 smart lockers. Pick up and return anytime.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">3 Locations in Estonia</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Open 24/7</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Star className="w-4 h-4" />
              <span className="text-sm">4.8★ Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-50 border-b border-danger-100 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-danger-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Products grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Available Tools
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DEMO_PRODUCTS.map((product) => {
            const isInCart = cart?.items.some(
              (item) => item.product.id === product.id
            );

            return (
              <div key={product.id} className="card-hover overflow-hidden">
                {/* Image placeholder */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 leading-tight">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {product.rating}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 capitalize mb-3">
                    {product.category.replace('-', ' ')}
                  </p>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(product.base_price_per_hour)}/hr
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(product.base_price_per_day)}/day
                    </span>
                  </div>
                  
                  <Button
                    variant={isInCart ? 'secondary' : 'primary'}
                    size="md"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={isInCart || isLoading}
                    leftIcon={isInCart ? undefined : <Plus className="w-4 h-4" />}
                    className="w-full"
                  >
                    {isInCart ? 'In Cart' : 'Add to Cart'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Cart preview bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 lg:hidden safe-bottom">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setCurrentView('cart')}
            className="w-full"
            rightIcon={<ShoppingCart className="w-5 h-5" />}
          >
            View Cart ({cartItemCount} item{cartItemCount !== 1 ? 's' : ''})
          </Button>
        </div>
      )}
    </div>
  );
}

export default App;
