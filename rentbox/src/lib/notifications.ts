import prisma from './prisma';

export async function sendEmail(to: string, subject: string, body: string) {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Body: ${body}`);
  // Log to DB as AiAction
  await prisma.aiAction.create({
    data: {
      type: 'email',
      reason: `Sent email: ${subject}`,
      outcome: 'success',
    },
  });
  return true;
}

export async function sendSms(to: string, body: string) {
  console.log(`[SMS] To: ${to}, Body: ${body}`);
  await prisma.aiAction.create({
    data: {
      type: 'sms',
      reason: 'Sent SMS',
      outcome: 'success',
    },
  });
  return true;
}
