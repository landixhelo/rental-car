import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CLIENT_ORIGIN: z.string().url(),
  /** Comma-separated extra allowed origins, e.g. https://landixhelo.me,https://www.landixhelo.me */
  CLIENT_ORIGINS: z.string().optional().default(""),
  /** Public web app URL for Stripe redirects (defaults to CLIENT_ORIGIN). */
  PUBLIC_APP_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BCRYPT_ROUNDS: z.coerce.number().min(10).default(12),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().min(2).optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_PHONE: z.string().optional().default("355690000000"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

export function getAllowedOrigins(): string[] {
  const extras = env.CLIENT_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(
    new Set([
      env.CLIENT_ORIGIN,
      ...extras,
      "http://localhost:5173",
      "http://localhost:5174",
      "https://landixhelo.me",
      "https://www.landixhelo.me",
    ])
  );
}
