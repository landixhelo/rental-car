import { prisma } from "./prisma.js";

/**
 * Ensure critical columns exist even if `prisma db push` was skipped at boot.
 * Safe to run repeatedly (IF NOT EXISTS).
 */
export async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT
    `);
    // Unique index (ignore if already exists)
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_stripeSessionId_key'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'Reservation_stripeSessionId_key'
        ) THEN
          ALTER TABLE "Reservation"
          ADD CONSTRAINT "Reservation_stripeSessionId_key" UNIQUE ("stripeSessionId");
        END IF;
      END $$;
    `);
    console.log("[schema] Reservation.stripeSessionId OK");
  } catch (err) {
    console.error("[schema] ensureSchema failed:", err);
  }
}
