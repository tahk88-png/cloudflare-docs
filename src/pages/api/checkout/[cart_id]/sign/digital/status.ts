import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
	getCheckoutConsent,
	updateCheckoutConsent,
} from '~/lib/db/queries';

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
		const { session_id, signature_ref, signer_identifier_masked, signer_name } = body;

		if (!session_id) {
			return new Response(
				JSON.stringify({ error: 'Session ID required' }),
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

		// TODO: Verify signature with eID provider using session_id
		// For now, simulate verification success if signature_ref is provided

		if (signature_ref && signer_identifier_masked && signer_name) {
			const signedAt = new Date().toISOString();

			await updateCheckoutConsent(db, cartId, {
				signature_method: consent.signature_method || 'smartid',
				signer_name: signer_name,
				signer_identifier_masked: signer_identifier_masked,
				signed_at: signedAt,
				signature_ref: signature_ref,
				status: 'verified',
			});

			const updatedConsent = await getCheckoutConsent(db, cartId);

			return new Response(
				JSON.stringify({
					status: 'verified',
					consent: updatedConsent,
					message: 'Allkiri kinnitatud',
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Still pending
		return new Response(
			JSON.stringify({
				status: 'pending',
				message: 'Ootan kinnitust…',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error checking digital signature status:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
