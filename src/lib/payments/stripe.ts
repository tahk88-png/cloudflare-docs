import type { CartInfo } from '../db/types';

export interface PaymentIntent {
	id: string;
	client_secret: string;
	amount: number;
	currency: string;
	status: string;
}

export interface PaymentSession {
	session_id: string;
	payment_intent_id: string;
	client_secret: string;
}

/**
 * Creates a Stripe Payment Intent
 * In production, this would call Stripe API
 */
export async function createPaymentIntent(
	cartId: string,
	cartInfo: CartInfo,
	stripeSecretKey: string,
): Promise<PaymentIntent> {
	const amountInCents = Math.round(cartInfo.total_amount * 100);

	// In production, use Stripe SDK:
	// const stripe = new Stripe(stripeSecretKey);
	// const paymentIntent = await stripe.paymentIntents.create({
	//   amount: amountInCents,
	//   currency: 'eur',
	//   metadata: {
	//     cart_id: cartId,
	//   },
	// });

	// Mock implementation for now
	const paymentIntentId = `pi_${crypto.randomUUID().replace(/-/g, '')}`;
	const clientSecret = `pi_${paymentIntentId}_secret_${crypto.randomUUID().substring(0, 24)}`;

	return {
		id: paymentIntentId,
		client_secret: clientSecret,
		amount: amountInCents,
		currency: 'eur',
		status: 'requires_payment_method',
	};
}

/**
 * Confirms a Stripe Payment Intent
 */
export async function confirmPaymentIntent(
	paymentIntentId: string,
	stripeSecretKey: string,
): Promise<{ status: string; succeeded: boolean }> {
	// In production:
	// const stripe = new Stripe(stripeSecretKey);
	// const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
	// return {
	//   status: paymentIntent.status,
	//   succeeded: paymentIntent.status === 'succeeded',
	// };

	// Mock implementation
	return {
		status: 'succeeded',
		succeeded: true,
	};
}

/**
 * Handles Stripe webhook event
 */
export async function handleStripeWebhook(
	event: {
		type: string;
		data: {
			object: {
				id: string;
				status?: string;
				metadata?: Record<string, string>;
			};
		};
	},
	stripeSecretKey: string,
): Promise<{ cartId?: string; paymentIntentId: string; status: string } | null> {
	// In production, verify webhook signature:
	// const stripe = new Stripe(stripeSecretKey);
	// const signature = request.headers.get('stripe-signature');
	// const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

	if (event.type === 'payment_intent.succeeded') {
		return {
			cartId: event.data.object.metadata?.cart_id,
			paymentIntentId: event.data.object.id,
			status: 'succeeded',
		};
	}

	if (event.type === 'payment_intent.payment_failed') {
		return {
			cartId: event.data.object.metadata?.cart_id,
			paymentIntentId: event.data.object.id,
			status: 'failed',
		};
	}

	return null;
}
