import Stripe from "stripe";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";

/** Only real Stripe secret keys — ignores passwords / placeholders. */
export function stripeEnabled() {
  const key = env.STRIPE_SECRET_KEY?.trim() || "";
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

export function getStripe() {
  if (!stripeEnabled()) {
    throw new AppError(
      "Pagesa me kartë nuk është e konfiguruar. Zgjidh Cash ose Bank Transfer.",
      400
    );
  }
  return new Stripe(env.STRIPE_SECRET_KEY!.trim());
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
