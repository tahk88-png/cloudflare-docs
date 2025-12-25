import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi } from '@/services/api';
import { Cart, CartTotals } from '@/types';
import { CartItemCard } from './CartItemCard';
import { CartSummary } from './CartSummary';
import { CountdownTimer } from './CountdownTimer';
import { Button } from '@/components/shared/Button';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface CartViewProps {
  cartId: string;
}

export function CartView({ cartId }: CartViewProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);
  
  const navigate = useNavigate();

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await cartApi.get(cartId);
      setCart(data.cart);
      setTotals(data.totals);
      setExpiresIn(data.expires_in_seconds);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [cartId]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      await cartApi.removeItem(cartId, itemId);
      await loadCart();
    } catch (err: any) {
      alert(`Failed to remove item: ${err.message}`);
    }
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      const result = await cartApi.validate(cartId);
      
      if (result.valid) {
        // Proceed to checkout
        navigate(`/checkout/${cartId}`);
      } else {
        setValidationIssues(result.issues);
      }
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleExpire = () => {
    setError('Your cart has expired. Please start a new rental.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Your cart is empty
          </h2>
          <p className="mt-2 text-gray-600">
            Add items to get started with your rental.
          </p>
          <Button className="mt-6" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
          <p className="mt-1 text-gray-600">
            {cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Timer */}
            <CountdownTimer
              expiresAt={cart.expires_at}
              onExpire={handleExpire}
            />

            {/* Validation Issues */}
            {validationIssues.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">
                      Some items are no longer available
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-800">
                      {validationIssues.map((issue, idx) => (
                        <li key={idx}>{issue.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {cart.items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onRemove={handleRemoveItem}
                disabled={cart.status !== 'active'}
              />
            ))}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {totals && (
                <CartSummary
                  totals={totals}
                  itemCount={cart.items.length}
                />
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleValidate}
                disabled={
                  cart.status !== 'active' ||
                  expiresIn <= 0 ||
                  validating
                }
              >
                {validating ? 'Validating...' : 'Proceed to Checkout'}
              </Button>

              <p className="text-center text-xs text-gray-500">
                By proceeding, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
