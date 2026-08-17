import webpush from "web-push";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let configured = false;

export function isWebPushConfigured() {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey() {
  return env.VAPID_PUBLIC_KEY || null;
}

function ensureConfigured() {
  if (configured) return isWebPushConfigured();
  if (!isWebPushConfigured()) return false;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:devbyland@gmail.com",
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!
  );
  configured = true;
  return true;
}

export async function sendWebPushToUsers(
  userIds: string[],
  payload: PushPayload
) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length || !ensureConfigured()) return;

  const rows = await prisma.pushSubscription.findMany({
    where: { userId: { in: ids } },
  });
  if (!rows.length) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/reservations",
  });

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" }
        );
      } catch (err) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: row.id } })
            .catch(() => {});
          return;
        }
        console.warn(
          "[push] send failed:",
          err instanceof Error ? err.message : err
        );
      }
    })
  );
}
