import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getCheckoutConsent } from '~/lib/db/queries';
import { updateCheckoutConsent } from '~/lib/db/queries';
import { createPaymentIntent } from '~/lib/payments/stripe';
import { canProceedToPayment } from '~/lib/checkout/payment-gating';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { cart_id, total_amount, rental_duration_hours, is_b2b } = body;

		if (!cart_id || typeof total_amount !== 'number') {
			return new Response(
				JSON.stringify({ error: 'Cart ID and total amount required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Access D1 database from Cloudflare runtime
		const db = (locals as any)?.runtime?.env?.DB as D1Database | undefined;

		if (!db) {
			return new Response(
				JSON.stringify({ error: 'Database not available' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const consent = await getCheckoutConsent(db, cart_id);
		if (!consent) {
			return new Response(
				JSON.stringify({ error: 'Consent not found' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify checkout can proceed
		const cartInfo = {
			cart_id,
			total_amount,
			rental_duration_hours: rental_duration_hours || 24,
			is_b2b: is_b2b || false,
		};

		const canProceed = await canProceedToPayment(db, cart_id, cartInfo, consent);
		if (!canProceed.allowed) {
			return new Response(
				JSON.stringify({ error: canProceed.reason || 'Cannot proceed to payment' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Get Stripe secret key from environment
		const stripeSecretKey =
			(locals as any)?.runtime?.env?.STRIPE_SECRET_KEY ||
			process.env.STRIPE_SECRET_KEY ||
			'';

		if (!stripeSecretKey) {
			return new Response(
				JSON.stringify({ error: 'Stripe not configured' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Create payment intent
		const paymentIntent = await createPaymentIntent(cart_id, cartInfo, stripeSecretKey);

		// Update consent with payment intent ID
		await updateCheckoutConsent(db, cart_id, {
			payment_intent_id: paymentIntent.id,
			payment_status: 'pending',
			payment_amount: paymentIntent.amount,
			payment_currency: paymentIntent.currency,
		});

		return new Response(
			JSON.stringify({
				client_secret: paymentIntent.client_secret,
				payment_intent_id: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error creating payment intent:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
