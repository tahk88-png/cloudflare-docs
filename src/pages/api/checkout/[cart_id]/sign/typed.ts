import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
	getCheckoutConsent,
	updateCheckoutConsent,
	getActiveTermsVersion,
} from '~/lib/db/queries';
import { computeContractHash } from '~/lib/signing/policy';

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
		const { signer_name } = body;

		if (!signer_name || typeof signer_name !== 'string' || signer_name.trim().length === 0) {
			return new Response(
				JSON.stringify({ error: 'Signer name is required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const consent = await getCheckoutConsent(db, cartId);
		if (!consent) {
			return new Response(
				JSON.stringify({ error: 'Consent not found. Please accept terms first.' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		if (!consent.consent_1 || !consent.consent_2) {
			return new Response(
				JSON.stringify({ error: 'Both consents must be accepted' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Verify terms version is still active
		const activeTerms = await getActiveTermsVersion(db);
		if (!activeTerms || activeTerms.id !== consent.terms_version_id) {
			return new Response(
				JSON.stringify({ error: 'Terms version has changed. Please review and accept again.' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		// Recompute contract hash to ensure consistency
		const contractHash = computeContractHash(
			activeTerms.id,
			activeTerms.content_hash,
			cartId,
		);

		const signedAt = new Date().toISOString();

		await updateCheckoutConsent(db, cartId, {
			signature_method: 'typed',
			signer_name: signer_name.trim(),
			signed_at: signedAt,
			contract_hash: contractHash,
			ip: request.headers.get('cf-connecting-ip') || consent.ip,
			user_agent: request.headers.get('user-agent') || consent.user_agent,
			status: 'signed',
		});

		const updatedConsent = await getCheckoutConsent(db, cartId);

		return new Response(JSON.stringify(updatedConsent), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error signing typed signature:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
