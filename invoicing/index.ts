// Main invoicing system worker entry point

import type { Env } from './types';
import { Database } from './db';
import { PDFService } from './pdf';
import { EmailService } from './email';
import { AuthService } from './auth';
import { InvoiceAPI } from './api/routes';
import { queueConsumer } from './queue';
import { scheduledHandler } from './scheduled';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const db = new Database(env.DB);
		const pdfService = new PDFService(env.R2_PDFS, env.DOMAIN);
		const emailService = new EmailService(
			db,
			env.QUEUE,
			env.EMAIL_FROM,
			env.EMAIL_REPLY_TO,
			env.DOMAIN
		);
		const authService = new AuthService(db);
		const api = new InvoiceAPI(db, pdfService, emailService, authService);

		return api.handleRequest(request, env);
	},

	async queue(batch: MessageBatch, env: Env): Promise<void> {
		await queueConsumer(batch, env);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		await scheduledHandler(env);
	},
};
