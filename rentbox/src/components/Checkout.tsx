import React, { useState } from 'react';
import { Button, Card, Badge } from './ui';
import { Cart } from '../types';

// Mock Stripe Elements wrapper
const StripePaymentForm = ({ onPay }: { onPay: () => void }) => (
    <div className="border border-gray-200 rounded p-4 bg-gray-50 my-4">
        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Card Details</label>
            <div className="bg-white border rounded p-3 text-gray-400">
                **** **** **** 4242   MM/YY CVC
            </div>
        </div>
        <Button onClick={onPay} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Pay Now
        </Button>
    </div>
);

export const CheckoutView = ({ cart }: { cart: Cart }) => {
    const [step, setStep] = useState<'review' | 'payment' | 'processing' | 'success' | 'error'>('review');
    const [error, setError] = useState<string | null>(null);

    const handleConfirmReview = () => {
        // Here we would call POST /api/cart/:id/checkout to validate and get clientSecret
        setStep('payment');
    };

    const handlePayment = async () => {
        setStep('processing');
        
        // Simulate API call and Stripe confirm
        setTimeout(() => {
            // Success scenario
            setStep('success');
            // Error scenario:
            // setError("Payment failed. Please try again.");
            // setStep('error');
        }, 2000);
    };

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                    Your locker is <strong>A1</strong>. <br/>
                    We've sent the code to your email.
                </p>
                <Button onClick={() => window.location.reload()}>Back to Home</Button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Checkout</h1>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            <Card className="p-4 mb-6">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm text-gray-600">
                    {cart.items.map(item => (
                        <div key={item.id} className="flex justify-between">
                            <span>{item.product?.name || 'Item'}</span>
                            <span>€{item.price.toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold text-black">
                        <span>Total</span>
                        <span>€{cart.items.reduce((a, b) => a + b.price + b.deposit, 0).toFixed(2)}</span>
                    </div>
                </div>
            </Card>

            {step === 'review' && (
                <Button className="w-full" onClick={handleConfirmReview}>
                    Proceed to Payment
                </Button>
            )}

            {step === 'payment' && (
                <StripePaymentForm onPay={handlePayment} />
            )}

            {step === 'processing' && (
                <div className="text-center py-8">
                    <div className="animate-spin text-2xl mb-2">↻</div>
                    <p>Processing payment...</p>
                </div>
            )}
        </div>
    );
};
