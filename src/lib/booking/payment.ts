// Payment service
// Handles payment intent creation and webhook processing

import type { Payment, CheckoutRequest, CheckoutResponse } from './types';
import { query, transaction } from './db/client';
import { validateCart, lockCart, getCartItems, completeCart } from './cart';
import { createBookingFromCart } from './booking';
import { releaseCartLocks } from './availability';

// Mock Stripe client - replace with actual Stripe SDK
interface StripeClient {
	paymentIntents: {
		create: (params: any) => Promise<{ id: string; client_secret: string }>;
		retrieve: (id: string) => Promise<{ status: string }>;
	};
}

// This should be replaced with actual Stripe initialization
let stripeClient: StripeClient | null = null;

export function getStripeClient(): StripeClient {
	if (!stripeClient) {
		// In production, initialize Stripe here
		// stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
		throw new Error('Stripe client not initialized. Set STRIPE_SECRET_KEY environment variable.');
	}
	return stripeClient;
}

/**
 * Create checkout session
 */
export async function createCheckout(
	userId: string,
	request: CheckoutRequest
): Promise<CheckoutResponse> {
	return transaction(async (client) => {
		// Validate cart
		const validation = await validateCart(request.cart_id);

		if (!validation.valid) {
			throw new Error(
				`Cart validation failed: ${validation.errors.map((e) => e.error).join(', ')}`
			);
		}

		// Lock cart
		await lockCart(request.cart_id);

		// Get cart items and calculate total
		const items = await getCartItems(request.cart_id);
		const totalAmount = items.reduce(
			(sum, item) => sum + item.price + item.deposit,
			0
		);

		// Create payment intent
		const stripe = getStripeClient();
		const paymentIntent = await stripe.paymentIntents.create({
			amount: totalAmount,
			currency: 'eur',
			metadata: {
				cart_id: request.cart_id,
				user_id: userId,
			},
		});

		// Create payment record
		await client.query(
			`INSERT INTO payments (cart_id, provider, intent_id, status, amount, currency)
			 VALUES ($1, 'stripe', $2, 'pending', $3, 'EUR')`,
			[request.cart_id, paymentIntent.id, totalAmount]
		);

		return {
			checkout_id: request.cart_id,
			payment_intent_id: paymentIntent.id,
			client_secret: paymentIntent.client_secret,
			redirect_url: request.return_url,
			total_amount: totalAmount,
			currency: 'EUR',
		};
	});
}

/**
 * Confirm payment and create bookings
 */
export async function confirmPayment(
	paymentIntentId: string,
	userId: string
): Promise<{ bookings: any[]; payment: Payment }> {
	return transaction(async (client) => {
		// Get payment record
		const paymentResult = await client.query<Payment>(
			'SELECT * FROM payments WHERE intent_id = $1',
			[paymentIntentId]
		);

		if (paymentResult.rows.length === 0) {
			throw new Error('Payment not found');
		}

		const payment = paymentResult.rows[0];

		if (payment.status === 'succeeded') {
			// Already processed (idempotency)
			const bookings = await query(
				'SELECT * FROM bookings WHERE id IN (SELECT booking_id FROM payments WHERE intent_id = $1)',
				[paymentIntentId]
			);
			return { bookings: bookings.rows, payment };
		}

		// Verify payment with Stripe
		const stripe = getStripeClient();
		const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

		if (intent.status !== 'succeeded') {
			await client.query(
				"UPDATE payments SET status = 'failed' WHERE id = $1",
				[payment.id]
			);
			throw new Error(`Payment not succeeded: ${intent.status}`);
		}

		// Update payment status
		await client.query(
			"UPDATE payments SET status = 'succeeded' WHERE id = $1",
			[payment.id]
		);

		if (!payment.cart_id) {
			throw new Error('Payment has no associated cart');
		}

		// Create bookings
		const bookings = await createBookingFromCart(userId, payment.cart_id);

		// Link bookings to payment
		for (const booking of bookings) {
			await client.query(
				'UPDATE payments SET booking_id = $1 WHERE id = $2',
				[booking.id, payment.id]
			);
		}

		// Complete cart
		await completeCart(payment.cart_id);

		// Release locks (they're now converted to bookings)
		await releaseCartLocks(payment.cart_id);

		return { bookings, payment };
	});
}

/**
 * Handle payment webhook
 */
export async function handlePaymentWebhook(
	eventType: string,
	data: any
): Promise<void> {
	if (eventType === 'payment_intent.succeeded') {
		const paymentIntentId = data.id;
		const userId = data.metadata?.user_id;

		if (!userId) {
			throw new Error('User ID not found in payment metadata');
		}

		await confirmPayment(paymentIntentId, userId);
	} else if (eventType === 'payment_intent.payment_failed') {
		const paymentIntentId = data.id;

		// Mark payment as failed
		await query(
			"UPDATE payments SET status = 'failed' WHERE intent_id = $1",
			[paymentIntentId]
		);

		// Release locks
		const paymentResult = await query<Payment>(
			'SELECT * FROM payments WHERE intent_id = $1',
			[paymentIntentId]
		);

		if (paymentResult.rows.length > 0 && paymentResult.rows[0].cart_id) {
			await releaseCartLocks(paymentResult.rows[0].cart_id);
		}
	}
}
