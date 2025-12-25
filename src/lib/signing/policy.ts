import type { CartInfo, SigningPolicy } from '../db/types';

const DEFAULT_POLICY: SigningPolicy = {
	mode: 'auto',
	allowed_methods: ['typed', 'smartid', 'mobileid', 'idcard'],
	require_identity_fields: {
		typed: {
			full_name: true,
			email_phone: true,
		},
		digital: {
			full_name: true,
			personal_code: true,
		},
	},
	require_second_consent: true,
	terms_version_lock: true,
};

/**
 * Determines if strong digital signature is required based on policy
 */
export function requiresStrongSignature(
	cart: CartInfo,
	policy: SigningPolicy = DEFAULT_POLICY,
): boolean {
	if (cart.total_amount >= 250) {
		return true;
	}

	if (cart.rental_duration_hours > 72) {
		return true;
	}

	if (cart.is_b2b) {
		return true;
	}

	return false;
}

/**
 * Gets allowed signature methods for the cart
 */
export function getAllowedMethods(
	cart: CartInfo,
	policy: SigningPolicy = DEFAULT_POLICY,
): ('typed' | 'smartid' | 'mobileid' | 'idcard')[] {
	if (requiresStrongSignature(cart, policy)) {
		// Strong signature required - only digital methods
		return policy.allowed_methods.filter(
			(m) => m !== 'typed',
		) as ('smartid' | 'mobileid' | 'idcard')[];
	}

	// Default: typed allowed
	return policy.allowed_methods;
}

/**
 * Computes contract hash from terms content
 */
export function computeContractHash(
	termsVersionId: string,
	contentHash: string,
	cartId: string,
): string {
	const data = `${termsVersionId}:${contentHash}:${cartId}`;
	// In production, use crypto.subtle.digest
	return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}
