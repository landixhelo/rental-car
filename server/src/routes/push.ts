import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import {
  requireAuth,
  requireContractorOrAdmin,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { isWebPushConfigured, sendWebPushToUsers, vapidPublicKey } from "../lib/webPush.js";

const router = Router();

const subscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({
      p256dh: z.string().min(10).max(500),
      auth: z.string().min(8).max(200),
    }),
  }),
});

const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().url().max(2000),
  }),
});

router.get(
  "/vapid-public-key",
  requireAuth,
  requireContractorOrAdmin,
  (_req, res) => {
    const key = vapidPublicKey();
    res.json({ enabled: isWebPushConfigured() && Boolean(key), key });
  }
);

router.post(
  "/subscribe",
  requireAuth,
  requireContractorOrAdmin,
  validate(subscribeSchema),
  async (req, res, next) => {
    try {
      if (!isWebPushConfigured()) {
        throw new AppError("Push notifications are not configured", 503);
      }
      const { endpoint, keys } = req.body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const userAgent =
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"].slice(0, 400)
          : null;

      const row = await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId: req.user!.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
        update: {
          userId: req.user!.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
      });

      res.json({ ok: true, id: row.id });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/unsubscribe",
  requireAuth,
  requireContractorOrAdmin,
  validate(unsubscribeSchema),
  async (req, res, next) => {
    try {
      const { endpoint } = req.body as { endpoint: string };
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user!.id },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/test",
  requireAuth,
  requireContractorOrAdmin,
  async (req, res, next) => {
    try {
      if (!isWebPushConfigured()) {
        throw new AppError("Push notifications are not configured", 503);
      }
      const count = await prisma.pushSubscription.count({
        where: { userId: req.user!.id },
      });
      if (!count) {
        throw new AppError("Enable phone notifications first", 400);
      }
      await sendWebPushToUsers([req.user!.id], {
        title: "Auto Rental",
        body: "Njoftimi në telefon funksionon. Rezervimet e reja do të vijnë këtu.",
        url: "/reservations",
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
