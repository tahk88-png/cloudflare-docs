import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getActiveTermsVersion } from '~/lib/db/queries';

export const GET: APIRoute = async ({ locals }) => {
	try {
		// Access D1 database from Cloudflare runtime
		// In Astro with Cloudflare adapter, locals.runtime.env contains bindings
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

		const terms = await getActiveTermsVersion(db);

		if (!terms) {
			return new Response(
				JSON.stringify({ error: 'No active terms version found' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		return new Response(JSON.stringify(terms), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error fetching active terms:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
