import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { getStripe, stripeEnabled } from "../lib/stripePay.js";
import { sendMail } from "../lib/mail.js";
import { userAllowsEmail } from "../lib/notifyPrefs.js";

const router = Router();

/** Stripe webhook — must receive raw body (mounted before express.json). */
export async function stripeWebhookHandler(
  req: import("express").Request,
  res: import("express").Response
) {
  if (!stripeEnabled() || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).send("Stripe webhook not configured");
    return;
  }

  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).send("Missing signature");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    res.status(400).send("Invalid signature");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: { reservationId?: string };
      amount_total?: number | null;
    };
    const reservationId = session.metadata?.reservationId;
    if (reservationId) {
      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          stripeSessionId: session.id,
        },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          car: { select: { brand: true, model: true } },
        },
      });

      try {
        if (await userAllowsEmail(updated.user.id, "payment")) {
          await sendMail({
            to: updated.user.email,
            subject: "Auto Rental — pagesa u konfirmua",
            text: `Përshëndetje ${updated.user.fullName},\n\nPagesa për ${updated.car.brand} ${updated.car.model} u konfirmua.\nRezervimi është CONFIRMED.\n\nFaleminderit,\nAuto Rental`,
          });
        }
      } catch (e) {
        console.error("Paid email failed:", e);
      }
    }
  }

  res.json({ received: true });
}

router.get("/config", (_req, res) => {
  res.json({
    cardEnabled: stripeEnabled(),
  });
});

export default router;
