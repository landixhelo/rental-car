import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CLIENT_ORIGIN: z.string().url(),
  /** Comma-separated extra allowed origins, e.g. https://landixhelo.me,https://www.landixhelo.me */
  CLIENT_ORIGINS: z.string().optional().default(""),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BCRYPT_ROUNDS: z.coerce.number().min(10).default(12),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_NAME: z.string().min(2),
  UPLOAD_DIR: z.string().default("uploads"),
});

export const env = envSchema.parse(process.env);
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
