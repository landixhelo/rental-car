import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

export const GUEST_EMAIL_DOMAIN = "guest.viaegnatia.al";
export const GUEST_PASSWORD_MARKER = "guest!";

export function isPlaceholderGuestEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`));
}

export function isGuestPasswordHash(hash?: string | null) {
  return Boolean(hash?.startsWith(GUEST_PASSWORD_MARKER));
}

export async function findOrCreateBookingCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.role === "USER") {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: fullName || existing.fullName,
          phone: phone || existing.phone,
        },
      });
    }
    return existing.id;
  }

  try {
    const created = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash: `${GUEST_PASSWORD_MARKER}${randomBytes(24).toString("hex")}`,
        role: "USER",
      },
    });
    return created.id;
  } catch {
    const raced = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!raced) throw new Error("Could not save customer details");
    return raced.id;
  }
}
