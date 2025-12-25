import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getCheckoutConsent, updateCheckoutConsent } from '~/lib/db/queries';
import { handleStripeWebhook } from '~/lib/payments/stripe';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
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

		const body = await request.json();
		const stripeSecretKey =
			(locals as any)?.runtime?.env?.STRIPE_SECRET_KEY ||
			process.env.STRIPE_SECRET_KEY ||
			'';

		// Handle webhook event
		const result = await handleStripeWebhook(body, stripeSecretKey);

		if (!result || !result.cartId) {
			return new Response(JSON.stringify({ received: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const consent = await getCheckoutConsent(db, result.cartId);
		if (!consent) {
			console.error(`Consent not found for cart: ${result.cartId}`);
			return new Response(JSON.stringify({ received: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Update payment status
		if (result.status === 'succeeded') {
			await updateCheckoutConsent(db, result.cartId, {
				payment_status: 'succeeded',
				payment_completed_at: new Date().toISOString(),
			});

			// In production, create booking here
			// await createBooking(db, result.cartId, consent);
		} else if (result.status === 'failed') {
			await updateCheckoutConsent(db, result.cartId, {
				payment_status: 'failed',
			});
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error handling webhook:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
