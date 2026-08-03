import { prisma } from "./prisma.js";

/**
 * Ensure critical columns/enums exist even if `prisma db push` was skipped at boot.
 * Safe to run repeatedly (IF NOT EXISTS).
 */
export async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DocumentStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DepositStatus" AS ENUM ('NONE', 'HELD', 'RETURNED', 'FORFEITED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE'
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "documentNote" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "depositStatus" "DepositStatus" NOT NULL DEFAULT 'NONE'
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3)
    `);

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

    console.log("[schema] ensureSchema OK");
  } catch (err) {
    console.error("[schema] ensureSchema failed:", err);
  }
}
