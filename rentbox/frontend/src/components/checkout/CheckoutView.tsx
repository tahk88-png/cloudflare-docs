import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { cartApi } from '@/services/api';
import { Cart, CartTotals } from '@/types';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/shared/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { CheckCircle, Loader2, Lock } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CheckoutViewProps {
  cartId: string;
}

export function CheckoutView({ cartId }: CheckoutViewProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [totals, setTotals] = useState<CartTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, [cartId]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await cartApi.get(cartId);
      setCart(data.cart);
      setTotals(data.totals);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const returnUrl = `${window.location.origin}/booking-success?cart_id=${cartId}`;
      const cancelUrl = `${window.location.origin}/cart/${cartId}`;

      // Create payment intent
      const paymentData = await cartApi.checkout(
        cartId,
        returnUrl,
        cancelUrl,
        email
      );

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Use Stripe Elements or redirect to payment
      // For simplicity, showing the client secret
      // In production, you'd use Stripe Elements here
      navigate(`/payment/${cartId}?client_secret=${paymentData.client_secret}`);
      
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-900 font-medium">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => navigate(`/cart/${cartId}`)}
          >
            Return to Cart
          </Button>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Your cart is empty.</p>
          <Button className="mt-4" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-1 text-gray-600">Complete your rental booking</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="your@email.com"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      We'll send your booking confirmation and access codes here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rental Details */}
            <Card>
              <CardHeader>
                <CardTitle>Rental Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-900">
                        {item.product?.name}
                      </span>
                      <span className="font-medium">
                        €{(item.price + item.deposit).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Security Badge */}
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
              <Lock className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Secure Checkout</p>
                <p className="text-sm text-green-700">
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
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
                onClick={handleCheckout}
                disabled={processing || !email}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay Securely
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
