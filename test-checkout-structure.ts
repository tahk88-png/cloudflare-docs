#!/usr/bin/env tsx
/**
 * Simple structure test for Rentbox checkout implementation
 * Run with: npx tsx test-checkout-structure.ts
 */

import { existsSync } from 'fs';
import { readFileSync } from 'fs';

const requiredFiles = [
	// Migrations
	'migrations/001_create_terms_versions.sql',
	'migrations/002_create_checkout_consents.sql',
	'migrations/003_seed_initial_terms.sql',
	'migrations/004_add_payment_fields.sql',

	// Database types and queries
	'src/lib/db/types.ts',
	'src/lib/db/queries.ts',

	// Signing logic
	'src/lib/signing/policy.ts',
	'src/lib/checkout/payment-gating.ts',

	// Payment logic
	'src/lib/payments/stripe.ts',

	// UI Components
	'src/components/ui/button.tsx',
	'src/components/ui/checkbox.tsx',
	'src/components/ui/input.tsx',
	'src/components/ui/radio-group.tsx',
	'src/components/checkout/SigningConsent.tsx',
	'src/components/checkout/Payment.tsx',

	// API Routes
	'src/pages/api/terms/active.ts',
	'src/pages/api/checkout/[cart_id]/consent.ts',
	'src/pages/api/checkout/[cart_id]/sign/typed.ts',
	'src/pages/api/checkout/[cart_id]/sign/digital/start.ts',
	'src/pages/api/checkout/[cart_id]/sign/digital/status.ts',
	'src/pages/api/payments/create-intent.ts',
	'src/pages/api/payments/confirm.ts',
	'src/pages/api/payments/webhook.ts',
	'src/pages/api/cart/[cart_id]/checkout.ts',
	'src/pages/api/cart/[cart_id]/confirm-payment.ts',

	// Pages
	'src/pages/checkout/[cart_id].astro',
];

const requiredExports = [
	{ file: 'src/lib/signing/policy.ts', exports: ['requiresStrongSignature', 'getAllowedMethods', 'computeContractHash'] },
	{ file: 'src/lib/checkout/payment-gating.ts', exports: ['canProceedToPayment'] },
	{ file: 'src/lib/payments/stripe.ts', exports: ['createPaymentIntent', 'confirmPaymentIntent', 'handleStripeWebhook'] },
	{ file: 'src/components/checkout/SigningConsent.tsx', exports: ['SigningConsent'] },
	{ file: 'src/components/checkout/Payment.tsx', exports: ['Payment'] },
];

console.log('🧪 Testing Rentbox Checkout Structure...\n');

let errors = 0;
let warnings = 0;

// Test file existence
console.log('📁 Checking required files...');
for (const file of requiredFiles) {
	if (existsSync(file)) {
		console.log(`  ✅ ${file}`);
	} else {
		console.log(`  ❌ ${file} - MISSING`);
		errors++;
	}
}

// Test exports
console.log('\n📦 Checking exports...');
for (const { file, exports: expectedExports } of requiredExports) {
	if (!existsSync(file)) {
		console.log(`  ⚠️  ${file} - File not found, skipping export check`);
		warnings++;
		continue;
	}

	try {
		const content = readFileSync(file, 'utf-8');
		const missingExports: string[] = [];

		for (const exp of expectedExports) {
			// Check for export (export function, export const, export class, export { ... })
			const exportPattern = new RegExp(`export\\s+(function|const|class|async function|\\{[^}]*${exp}[^}]*\\})`, 'm');
			if (!exportPattern.test(content)) {
				missingExports.push(exp);
			}
		}

		if (missingExports.length === 0) {
			console.log(`  ✅ ${file} - All exports found`);
		} else {
			console.log(`  ⚠️  ${file} - Missing exports: ${missingExports.join(', ')}`);
			warnings++;
		}
	} catch (err) {
		console.log(`  ❌ ${file} - Error reading file: ${err}`);
		errors++;
	}
}

// Test Estonian text
console.log('\n🇪🇪 Checking Estonian text...');
const estonianTexts = [
	'Rentbox.ee tööriistade renditingimused',
	'Kinnitan, et olen tutvunud Rentbox.ee renditingimustega',
	'Nõustun, et rendiperioodi ületamisel rakendub hilinemistasu',
	'Ootan kinnitust',
	'Allkiri kinnitatud',
	'Maksa',
];

if (existsSync('src/components/checkout/SigningConsent.tsx')) {
	const content = readFileSync('src/components/checkout/SigningConsent.tsx', 'utf-8');
	for (const text of estonianTexts) {
		if (content.includes(text)) {
			console.log(`  ✅ Found: "${text.substring(0, 50)}..."`);
		} else {
			console.log(`  ⚠️  Missing: "${text.substring(0, 50)}..."`);
			warnings++;
		}
	}
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
	console.log('✅ All tests passed!');
	process.exit(0);
} else {
	console.log(`\n📊 Results: ${errors} errors, ${warnings} warnings`);
	if (errors > 0) {
		console.log('❌ Some required files are missing!');
		process.exit(1);
	} else {
		console.log('⚠️  Some warnings found, but structure looks good.');
		process.exit(0);
	}
}
