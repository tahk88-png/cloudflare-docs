// Queue consumer for email processing

import type { Env } from './types';
import { Database } from './db';
import { EmailService } from './email';

export async function queueConsumer(batch: MessageBatch<EmailQueueMessage>, env: Env) {
	const db = new Database(env.DB);
	const emailService = new EmailService(
		db,
		env.QUEUE,
		env.EMAIL_FROM,
		env.EMAIL_REPLY_TO,
		env.DOMAIN
	);

	for (const message of batch.messages) {
		try {
			await emailService.sendEmail(message);
			message.ack();
		} catch (error) {
			console.error('Failed to process email:', error);
			message.retry();
		}
	}
}

interface EmailQueueMessage {
	emailLogId: string;
	invoiceId: string;
	toEmail: string;
	subject: string;
	message: string;
	viewLink?: string;
}
