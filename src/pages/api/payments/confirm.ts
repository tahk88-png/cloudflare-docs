import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getCheckoutConsent, updateCheckoutConsent } from '~/lib/db/queries';
import { confirmPaymentIntent } from '~/lib/payments/stripe';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { payment_intent_id, cart_id } = body;

		if (!payment_intent_id || !cart_id) {
			return new Response(
				JSON.stringify({ error: 'Payment intent ID and cart ID required' }),
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

		if (consent.payment_intent_id !== payment_intent_id) {
			return new Response(
				JSON.stringify({ error: 'Payment intent mismatch' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const stripeSecretKey =
			(locals as any)?.runtime?.env?.STRIPE_SECRET_KEY ||
			process.env.STRIPE_SECRET_KEY ||
			'';

		// Confirm payment intent
		const result = await confirmPaymentIntent(payment_intent_id, stripeSecretKey);

		if (result.succeeded) {
			await updateCheckoutConsent(db, cart_id, {
				payment_status: 'succeeded',
				payment_completed_at: new Date().toISOString(),
			});

			// Create booking
			const bookingId = crypto.randomUUID();
			const lockerAccessCode = generateLockerAccessCode();

			// In production, save booking to database
			// await createBooking(db, {
			//   id: bookingId,
			//   cart_id: cart_id,
			//   consent_id: consent.id,
			//   locker_access_code: lockerAccessCode,
			//   ...
			// });

			// In production, send SMS/email with access code
			// await sendAccessCode(consent.customer_phone, lockerAccessCode);

			return new Response(
				JSON.stringify({
					success: true,
					booking_id: bookingId,
					locker_access_code: lockerAccessCode,
					message: 'Broneering loodud. Ligipääsukood saadetud SMS-iga.',
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		} else {
			await updateCheckoutConsent(db, cart_id, {
				payment_status: 'failed',
			});

			return new Response(
				JSON.stringify({
					success: false,
					error: 'Payment failed',
					status: result.status,
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	} catch (error) {
		console.error('Error confirming payment:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};

function generateLockerAccessCode(): string {
	// Generate 8-digit access code
	const code = Math.floor(10000000 + Math.random() * 90000000).toString();
	return `${code.substring(0, 4)}-${code.substring(4)}`;
}
