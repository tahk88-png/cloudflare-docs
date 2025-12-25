import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import type { CartInfo } from '~/lib/db/types';

interface PaymentProps {
	cartId: string;
	cartInfo: CartInfo;
	onPaymentSuccess: (bookingId: string, accessCode: string) => void;
	onPaymentError: (error: string) => void;
}

export function Payment({
	cartId,
	cartInfo,
	onPaymentSuccess,
	onPaymentError,
}: PaymentProps) {
	const [loading, setLoading] = useState(false);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
	const [cardElementReady, setCardElementReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Initialize Stripe Elements
		// In production, load Stripe.js:
		// const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
		// const elements = stripe.elements();
		// const cardElement = elements.create('card');
		// cardElement.mount('#card-element');
		// setCardElementReady(true);

		// For now, simulate ready state
		setCardElementReady(true);
	}, []);

	const handleCreatePaymentIntent = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/payments/create-intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cart_id: cartId,
					total_amount: cartInfo.total_amount,
					rental_duration_hours: cartInfo.rental_duration_hours,
					is_b2b: cartInfo.is_b2b,
				}),
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
				onPaymentError(data.error);
			} else {
				setClientSecret(data.client_secret);
				setPaymentIntentId(data.payment_intent_id);
			}
		} catch (err) {
			const errorMsg = 'Maksmise alustamine ebaõnnestus';
			setError(errorMsg);
			onPaymentError(errorMsg);
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handlePayment = async () => {
		if (!clientSecret || !paymentIntentId) {
			setError('Palun alustage maksmist');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// In production, use Stripe.js to confirm payment:
			// const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
			// const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
			//   payment_method: {
			//     card: cardElement,
			//     billing_details: {
			//       name: cartInfo.customer_name,
			//       email: cartInfo.customer_email,
			//     },
			//   },
			// });

			// For now, simulate payment confirmation
			const res = await fetch('/api/payments/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					payment_intent_id: paymentIntentId,
					cart_id: cartId,
				}),
			});

			const data = await res.json();
			if (data.success) {
				onPaymentSuccess(data.booking_id, data.locker_access_code);
			} else {
				setError(data.error || 'Makse ebaõnnestus');
				onPaymentError(data.error || 'Makse ebaõnnestus');
			}
		} catch (err) {
			const errorMsg = 'Makse ebaõnnestus';
			setError(errorMsg);
			onPaymentError(errorMsg);
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4 border-t border-gray-200 pt-6">
			<div>
				<h2 className="text-xl font-semibold mb-2">Makse</h2>
				<div className="bg-gray-50 p-4 rounded-md mb-4">
					<div className="flex justify-between items-center mb-2">
						<span className="text-gray-700">Kogusumma:</span>
						<span className="text-xl font-semibold">
							{cartInfo.total_amount.toFixed(2)} EUR
						</span>
					</div>
					{cartInfo.total_amount >= 250 && (
						<div className="text-sm text-gray-600 mt-2">
							* Suure summa tõttu on vaja tugevat digitaalset allkirja
						</div>
					)}
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
					{error}
				</div>
			)}

			{!clientSecret ? (
				<Button onClick={handleCreatePaymentIntent} disabled={loading || !cardElementReady}>
					{loading ? 'Laen...' : 'Alusta maksmist'}
				</Button>
			) : (
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2">
							Kaardimakse
						</label>
						<div
							id="card-element"
							className="border border-gray-300 rounded-md p-3 bg-white"
						>
							{/* Stripe Elements card input will be mounted here */}
							<div className="text-sm text-gray-500">
								Kaardimakse väljad laaditakse...
							</div>
						</div>
						<p className="text-xs text-gray-500 mt-1">
							Makse töödeldakse turvaliselt Stripe kaudu
						</p>
					</div>

					<Button onClick={handlePayment} disabled={loading}>
						{loading ? 'Töötlen makset...' : `Maksa ${cartInfo.total_amount.toFixed(2)} EUR`}
					</Button>
				</div>
			)}
		</div>
	);
}
