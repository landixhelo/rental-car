import { prisma } from "./prisma.js";

export type EmailNotifyKind =
  | "booking"
  | "cancel"
  | "payment"
  | "document";

const FIELD: Record<EmailNotifyKind, string> = {
  booking: "notifyBookingEmail",
  cancel: "notifyCancelEmail",
  payment: "notifyPaymentEmail",
  document: "notifyDocumentEmail",
};

/** Returns true when the user wants this email type (default true if missing). */
export async function userAllowsEmail(
  userId: string | null | undefined,
  kind: EmailNotifyKind
): Promise<boolean> {
  if (!userId) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyBookingEmail: true,
      notifyCancelEmail: true,
      notifyPaymentEmail: true,
      notifyDocumentEmail: true,
    },
  });
  if (!user) return true;
  const key = FIELD[kind] as keyof typeof user;
  return user[key] !== false;
}

export async function userAllowsEmailByAddress(
  email: string | null | undefined,
  kind: EmailNotifyKind
): Promise<boolean> {
  if (!email) return true;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      notifyBookingEmail: true,
      notifyCancelEmail: true,
      notifyPaymentEmail: true,
      notifyDocumentEmail: true,
    },
  });
  if (!user) return true;
  return userAllowsEmail(user.id, kind);
}

/** Preferred inbox for fleet booking alerts (fallback: account email). */
export async function fleetNotifyEmail(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      bookingNotifyEmail: true,
      notifyBookingEmail: true,
    },
  });
  if (!user || user.notifyBookingEmail === false) return null;
  const alt = user.bookingNotifyEmail?.trim();
  return alt || user.email;
}
