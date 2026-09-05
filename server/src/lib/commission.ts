import { prisma } from "./prisma.js";

/** Typical marketplace cut; super-admin can change it on their panel. */
export const DEFAULT_COMMISSION_PERCENT = 10;

export function asCommissionPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COMMISSION_PERCENT;
  return Math.min(100, Math.round(n * 100) / 100);
}

export async function getPlatformCommissionPercent() {
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { commissionPercent: true },
    orderBy: { createdAt: "asc" },
  });
  if (admin?.commissionPercent == null) return DEFAULT_COMMISSION_PERCENT;
  return asCommissionPercent(admin.commissionPercent);
}

export function commissionForOwner(
  ownerPercent: unknown,
  platformPercent: number
) {
  if (ownerPercent == null || ownerPercent === "") return platformPercent;
  return asCommissionPercent(ownerPercent);
}
