import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getCheckoutConsent } from '~/lib/db/queries';
import { getActiveTermsVersion } from '~/lib/db/queries';
import { computeContractHash } from '~/lib/signing/policy';

export const POST: APIRoute = async ({ params, locals }) => {
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

		// Verify consents are checked
		if (!consent.consent_1 || !consent.consent_2) {
			return new Response(
				JSON.stringify({ error: 'Both consents must be accepted' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify signature is complete
		if (consent.status !== 'signed' && consent.status !== 'verified') {
			return new Response(
				JSON.stringify({ error: 'Signature required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify terms version hasn't changed
		const activeTerms = await getActiveTermsVersion(db);
		if (!activeTerms || activeTerms.id !== consent.terms_version_id) {
			return new Response(
				JSON.stringify({ error: 'Terms version has changed. Please review and sign again.' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify contract hash is still valid
		const expectedHash = computeContractHash(
			activeTerms.id,
			activeTerms.content_hash,
			cartId,
		);
		if (consent.contract_hash !== expectedHash) {
			return new Response(
				JSON.stringify({ error: 'Contract hash mismatch. Please sign again.' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// All checks passed - proceed to payment
		return new Response(
			JSON.stringify({
				success: true,
				cart_id: cartId,
				consent_id: consent.id,
				message: 'Ready for payment',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error checking out:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
