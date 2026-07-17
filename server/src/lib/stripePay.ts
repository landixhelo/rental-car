import Stripe from "stripe";
import { env } from "../config/env.js";

export function stripeEnabled() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing");
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(input: {
  reservationId: string;
  amountEur: number;
  carLabel: string;
  customerEmail: string;
}) {
  const stripe = getStripe();
  const appUrl = env.PUBLIC_APP_URL || env.CLIENT_ORIGIN;
  const cents = Math.max(50, Math.round(input.amountEur * 100));

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: cents,
          product_data: {
            name: `AutoRent — ${input.carLabel}`,
            description: `Rezervim #${input.reservationId}`,
          },
        },
      },
    ],
    metadata: { reservationId: input.reservationId },
    success_url: `${appUrl}/reservations?paid=1`,
    cancel_url: `${appUrl}/reservations?payment=cancelled`,
  });
}
