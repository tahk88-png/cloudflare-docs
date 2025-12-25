import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_API_KEY: z.string().min(1).default("dev-admin-key"),
  ALLOWED_WIDGET_ORIGINS: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  SMS_PROVIDER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OUTBOUND_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5)
});

export type Env = z.infer<typeof EnvSchema>;

export function env(): Env {
  // Next exposes server env vars via process.env on the server side.
  // For scripts, we rely on the same mechanism.
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

