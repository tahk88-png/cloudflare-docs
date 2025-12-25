// POST /api/payments/webhook - Payment webhook handler
import type { APIRoute } from 'astro';
import { handlePaymentWebhook } from '~/lib/booking/payment';

export const POST: APIRoute = async ({ request }) => {
	try {
		// In production, verify webhook signature here
		// const signature = request.headers.get('stripe-signature');
		// const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

		const body = await request.json();
		const { type, data } = body;

		await handlePaymentWebhook(type, data);

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Webhook processed',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Webhook error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
