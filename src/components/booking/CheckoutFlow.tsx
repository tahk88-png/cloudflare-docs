// CheckoutFlow - Complete checkout process
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import type { CheckoutResponse } from '~/lib/booking/types';

interface CheckoutFlowProps {
	cartId: string;
	userId: string;
	checkoutData: CheckoutResponse;
	onSuccess: (bookings: any[]) => void;
	onError: (error: string) => void;
}

export function CheckoutFlow({
	cartId,
	userId,
	checkoutData,
	onSuccess,
	onError,
}: CheckoutFlowProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [processing, setProcessing] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		setProcessing(true);

		try {
			// Confirm payment
			const { error: submitError } = await elements.submit();

			if (submitError) {
				throw submitError;
			}

			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/booking/success?cart_id=${cartId}`,
				},
				redirect: 'if_required',
			});

			if (confirmError) {
				throw confirmError;
			}

			// Confirm payment on backend
			const response = await fetch(`/api/cart/${cartId}/confirm-payment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					payment_intent_id: checkoutData.payment_intent_id,
					user_id: userId,
				}),
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Payment confirmation failed');
			}

			onSuccess(data.bookings);
		} catch (err) {
			onError(err instanceof Error ? err.message : 'Payment failed');
		} finally {
			setProcessing(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<PaymentElement />
				</div>

				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex justify-between items-center mb-4">
						<span className="text-lg font-semibold">Total</span>
						<span className="text-lg font-semibold">
							€{(checkoutData.total_amount / 100).toFixed(2)}
						</span>
					</div>
				</div>

				<button
					type="submit"
					disabled={!stripe || processing}
					className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
				>
					{processing ? 'Processing...' : `Pay €${(checkoutData.total_amount / 100).toFixed(2)}`}
				</button>
			</form>
		</div>
	);
}
