import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import type { CartInfo } from '~/lib/db/types';
import { requiresStrongSignature, getAllowedMethods } from '~/lib/signing/policy';

interface TermsVersion {
	id: string;
	title: string;
	content_hash: string;
	url: string | null;
}

interface ConsentState {
	consent_1: boolean;
	consent_2: boolean;
	signature_method: 'typed' | 'smartid' | 'mobileid' | 'idcard' | null;
	signer_name: string;
	signed_at: string | null;
	status: 'pending' | 'signed' | 'verified';
}

interface SigningConsentProps {
	cartId: string;
	cartInfo: CartInfo;
	onSigningComplete: (consent: ConsentState) => void;
}

export function SigningConsent({
	cartId,
	cartInfo,
	onSigningComplete,
}: SigningConsentProps) {
	const [terms, setTerms] = useState<TermsVersion | null>(null);
	const [consent, setConsent] = useState<ConsentState>({
		consent_1: false,
		consent_2: false,
		signature_method: null,
		signer_name: '',
		signed_at: null,
		status: 'pending',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [digitalMethod, setDigitalMethod] = useState<'smartid' | 'mobileid' | 'idcard'>('smartid');
	const [digitalStatus, setDigitalStatus] = useState<'idle' | 'pending' | 'verified' | 'error'>('idle');
	const [digitalSessionId, setDigitalSessionId] = useState<string | null>(null);

	const needsStrongSignature = requiresStrongSignature(cartInfo);
	const allowedMethods = getAllowedMethods(cartInfo);

	useEffect(() => {
		// Load active terms
		fetch('/api/terms/active')
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setError(data.error);
				} else {
					setTerms(data);
				}
			})
			.catch((err) => {
				setError('Failed to load terms');
				console.error(err);
			});

		// Load existing consent
		fetch(`/api/checkout/${cartId}/consent`)
			.then((res) => res.json())
			.then((data) => {
				if (data && !data.error) {
					setConsent({
						consent_1: data.consent_1 || false,
						consent_2: data.consent_2 || false,
						signature_method: data.signature_method,
						signer_name: data.signer_name || '',
						signed_at: data.signed_at,
						status: data.status,
					});
					if (data.status === 'signed' || data.status === 'verified') {
						onSigningComplete({
							consent_1: data.consent_1,
							consent_2: data.consent_2,
							signature_method: data.signature_method,
							signer_name: data.signer_name || '',
							signed_at: data.signed_at,
							status: data.status,
						});
					}
				}
			})
			.catch((err) => {
				console.error('Failed to load consent:', err);
			});
	}, [cartId]);

	const handleConsentChange = async (field: 'consent_1' | 'consent_2', value: boolean) => {
		const newConsent = { ...consent, [field]: value };
		setConsent(newConsent);

		setLoading(true);
		try {
			const res = await fetch(`/api/checkout/${cartId}/consent`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					consent_1: newConsent.consent_1,
					consent_2: newConsent.consent_2,
				}),
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
			} else {
				setError(null);
			}
		} catch (err) {
			setError('Failed to save consent');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleTypedSignature = async () => {
		if (!consent.signer_name.trim()) {
			setError('Palun sisestage oma ees- ja perekonnanimi');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch(`/api/checkout/${cartId}/sign/typed`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					signer_name: consent.signer_name.trim(),
				}),
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
			} else {
				setConsent({
					...consent,
					signature_method: 'typed',
					signed_at: data.signed_at,
					status: 'signed',
				});
				onSigningComplete({
					...consent,
					signature_method: 'typed',
					signed_at: data.signed_at,
					status: 'signed',
				});
			}
		} catch (err) {
			setError('Allkirjastamine ebaõnnestus');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleDigitalSignatureStart = async () => {
		setLoading(true);
		setError(null);
		setDigitalStatus('pending');

		try {
			const res = await fetch(`/api/checkout/${cartId}/sign/digital/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					method: digitalMethod,
				}),
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
				setDigitalStatus('error');
			} else {
				setDigitalSessionId(data.session_id);
				// Start polling for status
				pollDigitalSignatureStatus(data.session_id);
			}
		} catch (err) {
			setError('Allkirjastamine ebaõnnestus');
			setDigitalStatus('error');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const pollDigitalSignatureStatus = async (sessionId: string) => {
		const maxAttempts = 60; // 5 minutes max
		let attempts = 0;

		const poll = async () => {
			if (attempts >= maxAttempts) {
				setError('Allkirjastamine aegus');
				setDigitalStatus('error');
				return;
			}

			try {
				const res = await fetch(`/api/checkout/${cartId}/sign/digital/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						session_id: sessionId,
						// In production, these would come from the eID provider
						signature_ref: `ref_${sessionId}`,
						signer_identifier_masked: '****1234',
						signer_name: 'Test User',
					}),
				});

				const data = await res.json();
				if (data.status === 'verified') {
					setDigitalStatus('verified');
					setConsent({
						...consent,
						signature_method: digitalMethod,
						signed_at: data.consent.signed_at,
						status: 'verified',
					});
					onSigningComplete({
						...consent,
						signature_method: digitalMethod,
						signed_at: data.consent.signed_at,
						status: 'verified',
					});
				} else if (data.status === 'pending') {
					attempts++;
					setTimeout(poll, 5000); // Poll every 5 seconds
				} else {
					setError(data.error || 'Allkirjastamine ebaõnnestus');
					setDigitalStatus('error');
				}
			} catch (err) {
				setError('Allkirjastamine ebaõnnestus');
				setDigitalStatus('error');
				console.error(err);
			}
		};

		poll();
	};

	const canSign = consent.consent_1 && consent.consent_2;
	const isSigned = consent.status === 'signed' || consent.status === 'verified';

	return (
		<div className="space-y-6 border-t border-gray-200 pt-6">
			<div>
				<h2 className="text-xl font-semibold mb-2">
					Rentbox.ee tööriistade renditingimused
				</h2>
				{terms && (
					<div className="mb-4">
						<p className="text-sm text-gray-600 mb-2">
							{terms.title}
						</p>
						{terms.url && (
							<a
								href={terms.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-600 hover:underline"
							>
								Laadi alla renditingimused (PDF)
							</a>
						)}
					</div>
				)}

				<div className="space-y-3 mb-4 text-sm text-gray-700">
					<ul className="list-disc list-inside space-y-1">
						<li>Tööriist tuleb tagastada samasse kappi rendiperioodi lõpuks</li>
						<li>Hilinemisel rakendub lisatasu vastavalt hinnakirjale</li>
						<li>Klient vastutab tööriista kadumise ja kahjustuste eest</li>
						<li>Tööriist tuleb tagastada puhtana ja töökorras</li>
					</ul>
				</div>

				<div className="space-y-3">
					<label className="flex items-start space-x-3 cursor-pointer">
						<Checkbox
							checked={consent.consent_1}
							onChange={(e) =>
								handleConsentChange('consent_1', e.target.checked)
							}
							disabled={loading || isSigned}
						/>
						<span className="text-sm">
							Kinnitan, et olen tutvunud Rentbox.ee renditingimustega ja nõustun
							nendega.
						</span>
					</label>

					<label className="flex items-start space-x-3 cursor-pointer">
						<Checkbox
							checked={consent.consent_2}
							onChange={(e) =>
								handleConsentChange('consent_2', e.target.checked)
							}
							disabled={loading || isSigned}
						/>
						<span className="text-sm">
							Nõustun, et rendiperioodi ületamisel rakendub hilinemistasu ning
							vastutan tööriista kahjustumise või kadumise eest.
						</span>
					</label>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
					{error}
				</div>
			)}

			{canSign && !isSigned && (
				<div className="space-y-4">
					{needsStrongSignature ? (
						<div className="space-y-4">
							<p className="text-sm text-gray-700">
								Kuna teie tellimus ületab 250 EUR või rendiperiood on üle 72 tunni,
								on vaja tugevat digitaalset allkirja.
							</p>

							<RadioGroup
								value={digitalMethod}
								onValueChange={(value) =>
									setDigitalMethod(value as 'smartid' | 'mobileid' | 'idcard')
								}
							>
								{allowedMethods.includes('smartid') && (
									<label className="flex items-center space-x-2 cursor-pointer">
										<RadioGroupItem value="smartid" />
										<span className="text-sm">Smart-ID</span>
									</label>
								)}
								{allowedMethods.includes('mobileid') && (
									<label className="flex items-center space-x-2 cursor-pointer">
										<RadioGroupItem value="mobileid" />
										<span className="text-sm">Mobiil-ID</span>
									</label>
								)}
								{allowedMethods.includes('idcard') && (
									<label className="flex items-center space-x-2 cursor-pointer">
										<RadioGroupItem value="idcard" />
										<span className="text-sm">ID-kaart</span>
									</label>
								)}
							</RadioGroup>

							{digitalStatus === 'pending' && (
								<div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
									Ootan kinnitust…
								</div>
							)}

							{digitalStatus === 'verified' && (
								<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
									Allkiri kinnitatud
								</div>
							)}

							{digitalStatus === 'idle' && (
								<Button
									onClick={handleDigitalSignatureStart}
									disabled={loading}
								>
									Alusta allkirjastamist
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Ees- ja perekonnanimi
								</label>
								<Input
									type="text"
									value={consent.signer_name}
									onChange={(e) =>
										setConsent({ ...consent, signer_name: e.target.value })
									}
									placeholder="Ees- ja perekonnanimi"
									disabled={loading}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Elektrooniline kinnitus salvestatakse koos ajatempli ja tehnilise
									tõendiga.
								</p>
							</div>

							<Button onClick={handleTypedSignature} disabled={loading}>
								Allkirjasta
							</Button>
						</div>
					)}
				</div>
			)}

			{isSigned && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
					<div className="font-medium mb-1">Allkiri kinnitatud</div>
					<div className="text-xs">
						Allkirjastaja: {consent.signer_name}
						{consent.signed_at && (
							<span className="ml-2">
								({new Date(consent.signed_at).toLocaleString('et-EE')})
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
