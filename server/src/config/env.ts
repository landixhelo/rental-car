import "dotenv/config";
import { z } from "zod";

/** Treat empty env strings as missing (Railway UI often saves blank vars). */
function emptyToUndef(v: unknown) {
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.preprocess(emptyToUndef, z.string().default("8h")),
  CLIENT_ORIGIN: z.string().url(),
  /** Comma-separated extra allowed origins, e.g. https://landixhelo.me,https://www.landixhelo.me */
  CLIENT_ORIGINS: z.preprocess(emptyToUndef, z.string().optional().default("")),
  /** Public web app URL for Stripe redirects (defaults to CLIENT_ORIGIN). */
  PUBLIC_APP_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BCRYPT_ROUNDS: z.coerce.number().min(10).default(12),
  ADMIN_EMAIL: z.preprocess(emptyToUndef, z.string().email().optional()),
  ADMIN_PASSWORD: z.preprocess(emptyToUndef, z.string().min(8).optional()),
  ADMIN_NAME: z.preprocess(emptyToUndef, z.string().min(2).optional()),
  UPLOAD_DIR: z.preprocess(emptyToUndef, z.string().default("uploads")),
  SMTP_HOST: z.preprocess(emptyToUndef, z.string().optional()),
  SMTP_PORT: z.preprocess(emptyToUndef, z.coerce.number().default(587)),
  SMTP_USER: z.preprocess(emptyToUndef, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndef, z.string().optional()),
  SMTP_FROM: z.preprocess(emptyToUndef, z.string().optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndef, z.string().optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndef, z.string().optional()),
  WHATSAPP_PHONE: z.preprocess(
    emptyToUndef,
    z.string().optional().default("355689001257")
  ),
  BUSINESS_PHONE: z.preprocess(
    emptyToUndef,
    z.string().optional().default("+355689001257")
  ),
  BUSINESS_EMAIL: z.preprocess(
    emptyToUndef,
    z.string().email().optional().default("devbyland@gmail.com")
  ),
  BUSINESS_NIPT: z.preprocess(emptyToUndef, z.string().optional()),
  BUSINESS_ADDRESS: z.preprocess(
    emptyToUndef,
    z.string().optional().default("Tiranë, Shqipëri")
  ),
  BUSINESS_STREET: z.preprocess(emptyToUndef, z.string().optional()),
  /** Free cancellation window before pickup (hours). */
  CANCEL_FREE_HOURS: z.coerce.number().min(1).default(24),
  /** Default deposit in EUR when not overridden (0 = use 1 day rate). */
  DEFAULT_DEPOSIT_EUR: z.coerce.number().min(0).default(0),
  /** WebAuthn RP ID, e.g. landixhelo.me (no www). */
  WEBAUTHN_RP_ID: z.preprocess(emptyToUndef, z.string().optional()),
  WEBAUTHN_RP_NAME: z.preprocess(
    emptyToUndef,
    z.string().optional().default("AutoRent")
  ),
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
