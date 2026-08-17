import { prisma } from "./prisma.js";
import { uniqueCarSlug } from "./slug.js";
import { healPastReservations } from "./carAvailability.js";

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
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "cancelReason" TEXT
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Passkey" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "credentialId" TEXT NOT NULL,
        "publicKey" BYTEA NOT NULL,
        "counter" BIGINT NOT NULL DEFAULT 0,
        "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Passkey_credentialId_key"
      ON "Passkey"("credentialId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Passkey_userId_idx" ON "Passkey"("userId")
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Passkey_userId_fkey'
        ) THEN
          ALTER TABLE "Passkey"
          ADD CONSTRAINT "Passkey_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
      ON "PushSubscription"("endpoint")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"
      ON "PushSubscription"("userId")
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey'
        ) THEN
          ALTER TABLE "PushSubscription"
          ADD CONSTRAINT "PushSubscription_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
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
      DO $$ BEGIN
        CREATE TYPE "ListingStatus" AS ENUM (
          'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED', 'SOLD', 'ARCHIVED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "shopSlug" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "shopBio" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "shopLogoUrl" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "shopCity" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "shopIsPublic" BOOLEAN NOT NULL DEFAULT false
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "commissionPercent" DECIMAL(5,2)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_shopSlug_key" ON "User"("shopSlug")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_shopIsPublic_idx" ON "User"("shopIsPublic")
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Car"
      ADD COLUMN IF NOT EXISTS "listingStatus" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Car_listingStatus_idx" ON "Car"("listingStatus")
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "ownerPayout" DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VehicleListing" (
        "id" TEXT NOT NULL,
        "sellerId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "brand" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "price" DECIMAL(12,2) NOT NULL,
        "mileage" TEXT,
        "location" TEXT NOT NULL DEFAULT 'Tiranë',
        "fuel" TEXT,
        "transmission" TEXT,
        "type" TEXT,
        "color" TEXT,
        "description" TEXT NOT NULL,
        "images" JSONB NOT NULL DEFAULT '[]',
        "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VehicleListing_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VehicleListing_status_createdAt_idx"
      ON "VehicleListing"("status", "createdAt")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VehicleListing_sellerId_idx"
      ON "VehicleListing"("sellerId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VehicleListing_location_idx"
      ON "VehicleListing"("location")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VehicleListing_price_idx"
      ON "VehicleListing"("price")
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'VehicleListing_sellerId_fkey'
        ) THEN
          ALTER TABLE "VehicleListing"
          ADD CONSTRAINT "VehicleListing_sellerId_fkey"
          FOREIGN KEY ("sellerId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
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

    const closed = await healPastReservations(prisma);
    if (closed > 0) {
      console.log(`[schema] closed ${closed} past reservation(s)`);
    }

    console.log("[schema] ensureSchema OK");
  } catch (err) {
    console.error("[schema] ensureSchema failed:", err);
  }
}
