import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
	getCheckoutConsent,
	createCheckoutConsent,
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
		const { consent_1, consent_2 } = body;

		if (typeof consent_1 !== 'boolean' || typeof consent_2 !== 'boolean') {
			return new Response(
				JSON.stringify({ error: 'Both consents must be boolean' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const activeTerms = await getActiveTermsVersion(db);
		if (!activeTerms) {
			return new Response(
				JSON.stringify({ error: 'No active terms version found' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const existingConsent = await getCheckoutConsent(db, cartId);

		const contractHash = computeContractHash(
			activeTerms.id,
			activeTerms.content_hash,
			cartId,
		);

		if (existingConsent) {
			// Check if terms version changed
			if (existingConsent.terms_version_id !== activeTerms.id) {
				// Terms changed - reset signature
				await updateCheckoutConsent(db, cartId, {
					terms_version_id: activeTerms.id,
					contract_hash: contractHash,
					consent_1,
					consent_2,
					status: 'pending',
					signature_method: null,
					signer_name: null,
					signed_at: null,
				});
			} else {
				await updateCheckoutConsent(db, cartId, {
					consent_1,
					consent_2,
				});
			}
		} else {
			await createCheckoutConsent(db, {
				cart_id: cartId,
				terms_version_id: activeTerms.id,
				consent_1,
				consent_2,
				signature_method: null,
				signer_name: null,
				signer_identifier_masked: null,
				signed_at: null,
				ip: request.headers.get('cf-connecting-ip') || null,
				user_agent: request.headers.get('user-agent') || null,
				contract_hash: contractHash,
				signature_ref: null,
				status: 'pending',
			});
		}

		const updatedConsent = await getCheckoutConsent(db, cartId);

		return new Response(JSON.stringify(updatedConsent), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error updating consent:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
