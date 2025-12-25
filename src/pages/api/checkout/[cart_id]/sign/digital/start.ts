import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
	getCheckoutConsent,
	getActiveTermsVersion,
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
		const { method } = body; // 'smartid', 'mobileid', 'idcard'

		if (!['smartid', 'mobileid', 'idcard'].includes(method)) {
			return new Response(
				JSON.stringify({ error: 'Invalid signature method' }),
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

		// In production, integrate with actual eID providers (Smart-ID, Mobiil-ID, ID-kaart)
		// For now, return a mock session ID
		const sessionId = crypto.randomUUID();

		// TODO: Integrate with actual eID provider API
		// Example flow:
		// 1. Create signing session with provider
		// 2. Return session ID and challenge code
		// 3. Client polls /status endpoint

		return new Response(
			JSON.stringify({
				session_id: sessionId,
				method,
				status: 'pending',
				message: 'Ootan kinnitust…',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error starting digital signature:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
