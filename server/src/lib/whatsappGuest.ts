import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { prisma } from "./prisma.js";

export const GUEST_EMAIL_DOMAIN = "guest.viaegnatia.al";

export function isPlaceholderGuestEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`));
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Last 9 national digits, ignoring +355 / 00 / leading 0. */
export function phoneKey(digits: string) {
  let d = digits;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("355")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(-9);
}

export async function findOrCreateWhatsAppGuest(input: {
  fullName: string;
  phone: string;
  email?: string;
}) {
  const digits = phoneDigits(input.phone);
  if (digits.length < 6) {
    throw new AppError("Numri i telefonit nuk është i vlefshëm", 400);
  }

  const key = phoneKey(digits);
  const placeholderEmail = `wa-${key}@${GUEST_EMAIL_DOMAIN}`;
  const requestedEmail = input.email?.trim().toLowerCase() || "";
  const email = requestedEmail || placeholderEmail;

  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { email },
        { email: placeholderEmail },
        { phone: { contains: key } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
    },
    take: 25,
  });

  const match = candidates.find((u) => {
    if (u.role !== "USER") return false;
    const existingEmail = u.email.toLowerCase();
    if (existingEmail === email || existingEmail === placeholderEmail) {
      return true;
    }
    return u.phone ? phoneKey(phoneDigits(u.phone)) === key : false;
  });

  if (match) {
    const data: { fullName?: string; phone?: string; email?: string } = {};
    if (input.fullName && input.fullName !== match.fullName) {
      data.fullName = input.fullName;
    }
    if (!match.phone) data.phone = input.phone.trim();
    if (requestedEmail && isPlaceholderGuestEmail(match.email)) {
      data.email = requestedEmail;
    }
    if (Object.keys(data).length) {
      return prisma.user.update({ where: { id: match.id }, data });
    }
    return match;
  }

  const passwordHash = await bcrypt.hash(
    crypto.randomBytes(24).toString("hex"),
    env.BCRYPT_ROUNDS
  );

  try {
    return await prisma.user.create({
      data: {
        fullName: input.fullName,
        email,
        phone: input.phone.trim(),
        passwordHash,
        role: "USER",
      },
    });
  } catch {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.role === "USER") return existing;
    return prisma.user.create({
      data: {
        fullName: input.fullName,
        email: `wa-${key}-${crypto.randomBytes(3).toString("hex")}@${GUEST_EMAIL_DOMAIN}`,
        phone: input.phone.trim(),
        passwordHash,
        role: "USER",
      },
    });
  }
}
