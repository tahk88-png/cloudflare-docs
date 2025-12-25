import type { D1Database } from '@cloudflare/workers-types';
import type {
	CheckoutConsent,
	TermsVersion,
} from './types';

export async function getActiveTermsVersion(
	db: D1Database,
): Promise<TermsVersion | null> {
	const result = await db
		.prepare(
			'SELECT * FROM terms_versions WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1',
		)
		.first<TermsVersion>();

	return result || null;
}

export async function getTermsVersionById(
	db: D1Database,
	id: string,
): Promise<TermsVersion | null> {
	const result = await db
		.prepare('SELECT * FROM terms_versions WHERE id = ?')
		.bind(id)
		.first<TermsVersion>();

	return result || null;
}

export async function getCheckoutConsent(
	db: D1Database,
	cartId: string,
): Promise<CheckoutConsent | null> {
	const result = await db
		.prepare('SELECT * FROM checkout_consents WHERE cart_id = ?')
		.bind(cartId)
		.first<CheckoutConsent>();

	return result || null;
}

export async function createCheckoutConsent(
	db: D1Database,
	consent: Omit<CheckoutConsent, 'id' | 'created_at' | 'updated_at'>,
): Promise<string> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO checkout_consents (
        id, cart_id, terms_version_id, consent_1, consent_2,
        signature_method, signer_name, signer_identifier_masked,
        signed_at, ip, user_agent, contract_hash, signature_ref, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			consent.cart_id,
			consent.terms_version_id,
			consent.consent_1 ? 1 : 0,
			consent.consent_2 ? 1 : 0,
			consent.signature_method,
			consent.signer_name,
			consent.signer_identifier_masked,
			consent.signed_at,
			consent.ip,
			consent.user_agent,
			consent.contract_hash,
			consent.signature_ref,
			consent.status,
			now,
			now,
		)
		.run();

	return id;
}

export async function updateCheckoutConsent(
	db: D1Database,
	cartId: string,
	updates: Partial<CheckoutConsent>,
): Promise<void> {
	const fields: string[] = [];
	const values: unknown[] = [];

	if (updates.consent_1 !== undefined) {
		fields.push('consent_1 = ?');
		values.push(updates.consent_1 ? 1 : 0);
	}
	if (updates.consent_2 !== undefined) {
		fields.push('consent_2 = ?');
		values.push(updates.consent_2 ? 1 : 0);
	}
	if (updates.signature_method !== undefined) {
		fields.push('signature_method = ?');
		values.push(updates.signature_method);
	}
	if (updates.signer_name !== undefined) {
		fields.push('signer_name = ?');
		values.push(updates.signer_name);
	}
	if (updates.signer_identifier_masked !== undefined) {
		fields.push('signer_identifier_masked = ?');
		values.push(updates.signer_identifier_masked);
	}
	if (updates.signed_at !== undefined) {
		fields.push('signed_at = ?');
		values.push(updates.signed_at);
	}
	if (updates.ip !== undefined) {
		fields.push('ip = ?');
		values.push(updates.ip);
	}
	if (updates.user_agent !== undefined) {
		fields.push('user_agent = ?');
		values.push(updates.user_agent);
	}
	if (updates.contract_hash !== undefined) {
		fields.push('contract_hash = ?');
		values.push(updates.contract_hash);
	}
	if (updates.signature_ref !== undefined) {
		fields.push('signature_ref = ?');
		values.push(updates.signature_ref);
	}
	if (updates.status !== undefined) {
		fields.push('status = ?');
		values.push(updates.status);
	}

	if (fields.length === 0) {
		return;
	}

	fields.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(cartId);

	await db
		.prepare(`UPDATE checkout_consents SET ${fields.join(', ')} WHERE cart_id = ?`)
		.bind(...values)
		.run();
}
