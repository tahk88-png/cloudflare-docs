import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getCheckoutConsent } from '~/lib/db/queries';

/**
 * Legacy endpoint - kept for backwards compatibility
 * New payment flow uses /api/payments/confirm
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const cartId = params.cart_id;
		if (!cartId) {
			return new Response(JSON.stringify({ error: 'Cart ID required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
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

		const body = await request.json();
		const { payment_status } = body;

		if (payment_status !== 'completed') {
			return new Response(
				JSON.stringify({ error: 'Payment not completed' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const consent = await getCheckoutConsent(db, cartId);
		if (!consent) {
			return new Response(
				JSON.stringify({ error: 'Consent not found' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify signature is still valid
		if (consent.status !== 'signed' && consent.status !== 'verified') {
			return new Response(
				JSON.stringify({ error: 'Valid signature required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify payment status
		if (consent.payment_status !== 'succeeded') {
			return new Response(
				JSON.stringify({ error: 'Payment not succeeded' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// In production:
		// 1. Create booking record
		// 2. Generate locker access code
		// 3. Send access code via SMS/email
		// 4. Return booking confirmation

		return new Response(
			JSON.stringify({
				success: true,
				booking_id: crypto.randomUUID(),
				locker_access_code: '1234-5678',
				message: 'Broneering loodud. Ligipääsukood saadetud SMS-iga.',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
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
