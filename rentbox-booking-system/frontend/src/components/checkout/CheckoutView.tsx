// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT VIEW COMPONENT
// Main checkout page with payment form
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Lock, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { CountdownTimer } from '../cart/CountdownTimer';
import { PriceBreakdown } from '../cart/PriceBreakdown';
import { useCartStore } from '../../store/cart-store';
import { formatCurrency } from '../../utils/format';

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

interface CheckoutViewProps {
  onBack: () => void;
  onSuccess: (bookings: unknown[]) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onBack,
  onSuccess,
}) => {
  const { cart, initiateCheckout, confirmPayment, clearCart } = useCartStore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize checkout
  useEffect(() => {
    const initCheckout = async () => {
      try {
        const result = await initiateCheckout(
          `${window.location.origin}/checkout/complete`
        );
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize checkout');
      } finally {
        setIsInitializing(false);
      }
    };

    initCheckout();
  }, [initiateCheckout]);

  if (!cart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No cart found</p>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Preparing checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-danger-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Checkout Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button variant="primary" onClick={onBack}>
            Return to Cart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Payment form */}
          <div className="space-y-6">
            {/* Timer warning */}
            <CountdownTimer
              expiresInSeconds={cart.expires_in_seconds}
              onExpire={() => {
                setError('Your checkout session has expired');
                clearCart();
              }}
            />

            {/* Payment form */}
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0ea5e9',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <PaymentForm
                  paymentIntentId={paymentIntentId!}
                  onSuccess={onSuccess}
                  onError={setError}
                />
              </Elements>
            )}
          </div>

          {/* Order summary */}
          <div className="mt-8 lg:mt-0">
            <PriceBreakdown
              items={cart.items}
              summary={cart.summary}
            />

            {/* Security badges */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Lock className="w-4 h-4" />
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                <CreditCard className="w-4 h-4" />
                <span>Payments processed by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentFormProps {
  paymentIntentId: string;
  onSuccess: (bookings: unknown[]) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentIntentId,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { confirmPayment } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        onError(stripeError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm with our backend
        await confirmPayment(paymentIntentId);
        onSuccess([]);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </h2>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!stripe || isProcessing}
        isLoading={isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
};
