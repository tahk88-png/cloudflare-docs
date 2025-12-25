import { env } from "../env";

export type SendSmsInput = {
  to: string;
  text: string;
};

export type SendSmsResult = {
  provider: string;
  sid?: string;
};

async function sendSmsConsole(input: SendSmsInput): Promise<SendSmsResult> {
  // eslint-disable-next-line no-console
  console.log("[sms:console]", { to: input.to, text: input.text });
  return { provider: "console" };
}

async function sendSmsTwilio(input: SendSmsInput): Promise<SendSmsResult> {
  const e = env();
  if (!e.TWILIO_ACCOUNT_SID || !e.TWILIO_AUTH_TOKEN || !e.TWILIO_FROM_NUMBER) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).");
  }
  const body = new URLSearchParams();
  body.set("To", input.to);
  body.set("From", e.TWILIO_FROM_NUMBER);
  body.set("Body", input.text);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new Error(`Twilio send failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return { provider: "twilio", sid: data?.sid };
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const provider = (env().SMS_PROVIDER ?? "console").toLowerCase();
  if (provider === "twilio") return sendSmsTwilio(input);
  return sendSmsConsole(input);
}

