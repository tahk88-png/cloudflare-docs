export interface TermsVersion {
	id: string;
	title: string;
	content_hash: string;
	url: string | null;
	is_active: boolean;
	created_at: string;
}

export interface CheckoutConsent {
	id: string;
	cart_id: string;
	terms_version_id: string;
	consent_1: boolean;
	consent_2: boolean;
	signature_method: 'typed' | 'smartid' | 'mobileid' | 'idcard' | null;
	signer_name: string | null;
	signer_identifier_masked: string | null;
	signed_at: string | null;
	ip: string | null;
	user_agent: string | null;
	contract_hash: string;
	signature_ref: string | null;
	status: 'pending' | 'signed' | 'verified';
	created_at: string;
	updated_at: string;
}

export interface SigningPolicy {
	mode: 'auto';
	allowed_methods: ('typed' | 'smartid' | 'mobileid' | 'idcard')[];
	require_identity_fields: {
		typed: {
			full_name: boolean;
			email_phone: boolean;
		};
		digital: {
			full_name: boolean;
			personal_code: boolean;
		};
	};
	require_second_consent: boolean;
	terms_version_lock: boolean;
}

export interface CartInfo {
	cart_id: string;
	total_amount: number;
	rental_duration_hours: number;
	is_b2b: boolean;
	customer_email?: string;
	customer_phone?: string;
}
