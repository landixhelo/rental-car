import { prisma } from "./prisma.js";
import { uniqueCarSlug } from "./slug.js";

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

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Car"
      ADD COLUMN IF NOT EXISTS "slug" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Car_slug_key'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'Car_slug_key'
        ) THEN
          ALTER TABLE "Car" ADD CONSTRAINT "Car_slug_key" UNIQUE ("slug");
        END IF;
      END $$;
    `);

    const missing = await prisma.car.findMany({
      where: { OR: [{ slug: null }, { slug: "" }] },
      select: { id: true, brand: true, model: true, year: true },
    });
    for (const row of missing) {
      const slug = await uniqueCarSlug(row.brand, row.model, row.year, row.id);
      await prisma.car.update({
        where: { id: row.id },
        data: { slug },
      });
    }

    console.log("[schema] ensureSchema OK");
  } catch (err) {
    console.error("[schema] ensureSchema failed:", err);
  }
}
