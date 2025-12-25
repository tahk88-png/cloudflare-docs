import { env } from "../env";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  provider: string;
  messageId?: string;
};

async function sendEmailConsole(input: SendEmailInput): Promise<SendEmailResult> {
  // eslint-disable-next-line no-console
  console.log("[email:console]", { to: input.to, subject: input.subject, text: input.text });
  return { provider: "console" };
}

async function sendEmailSendgrid(input: SendEmailInput): Promise<SendEmailResult> {
  const e = env();
  if (!e.SENDGRID_API_KEY || !e.SENDGRID_FROM_EMAIL) {
    throw new Error("SendGrid is not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL).");
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${e.SENDGRID_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: e.SENDGRID_FROM_EMAIL },
      subject: input.subject,
      content: [{ type: "text/plain", value: input.text }]
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SendGrid send failed (${res.status}): ${text}`);
  }
  return { provider: "sendgrid", messageId: res.headers.get("x-message-id") ?? undefined };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = (env().EMAIL_PROVIDER ?? "console").toLowerCase();
  if (provider === "sendgrid") return sendEmailSendgrid(input);
  return sendEmailConsole(input);
}

