import type { CheckoutConsent, CartInfo } from '../db/types';
import { requiresStrongSignature } from '../signing/policy';
import { getActiveTermsVersion } from '../db/queries';
import { computeContractHash } from '../signing/policy';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Checks if payment button should be enabled
 */
export async function canProceedToPayment(
	db: D1Database,
	cartId: string,
	cartInfo: CartInfo,
	consent: CheckoutConsent | null,
): Promise<{ allowed: boolean; reason?: string }> {
	if (!consent) {
		return { allowed: false, reason: 'Consent not found' };
	}

	// Check both consents are accepted
	if (!consent.consent_1 || !consent.consent_2) {
		return { allowed: false, reason: 'Both consents must be accepted' };
	}

	// Check signature is complete
	if (consent.status !== 'signed' && consent.status !== 'verified') {
		return { allowed: false, reason: 'Signature required' };
	}

	// Verify terms version hasn't changed
	const activeTerms = await getActiveTermsVersion(db);
	if (!activeTerms) {
		return { allowed: false, reason: 'No active terms version found' };
	}

	if (activeTerms.id !== consent.terms_version_id) {
		return {
			allowed: false,
			reason: 'Terms version has changed. Please review and sign again.',
		};
	}

	// Verify contract hash is still valid
	const expectedHash = computeContractHash(
		activeTerms.id,
		activeTerms.content_hash,
		cartId,
	);
	if (consent.contract_hash !== expectedHash) {
		return {
			allowed: false,
			reason: 'Contract hash mismatch. Please sign again.',
		};
	}

	// Verify signature method matches policy
	if (requiresStrongSignature(cartInfo)) {
		if (consent.signature_method === 'typed') {
			return {
				allowed: false,
				reason: 'Strong digital signature required for this order',
			};
		}
		if (consent.status !== 'verified') {
			return {
				allowed: false,
				reason: 'Digital signature verification required',
			};
		}
	}

	return { allowed: true };
}
