import { env } from "../config/env.js";

function digits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

/** Business WhatsApp number (digits only). Owner override → env. */
export function businessWhatsAppDigits(ownerWhatsapp?: string | null) {
  const fromOwner = ownerWhatsapp ? digits(ownerWhatsapp) : "";
  if (fromOwner) return fromOwner;
  return digits(env.WHATSAPP_PHONE || env.BUSINESS_PHONE || "");
}

export function formatReservationWhatsAppText(input: {
  code?: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentMethod: string;
  pickupLocation?: string | null;
}) {
  return [
    "🚗 *Rezervim i ri — AutoRent*",
    "",
    input.code ? `Kodi: ${input.code}` : null,
    `Klienti: ${input.customerName}`,
    input.customerPhone ? `Tel: ${input.customerPhone}` : null,
    input.customerEmail ? `Email: ${input.customerEmail}` : null,
    `Makina: ${input.carLabel}`,
    `Datat: ${input.startDate} → ${input.endDate}`,
    input.pickupLocation ? `Marrja: ${input.pickupLocation}` : null,
    `Totali: €${input.totalPrice}`,
    `Pagesa: ${input.paymentMethod}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Notify the business WhatsApp when a customer books.
 * Uses CallMeBot (no Meta Business app required) when CALLMEBOT_APIKEY is set.
 * https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */
export async function notifyBusinessWhatsApp(input: {
  ownerWhatsapp?: string | null;
  code?: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentMethod: string;
  pickupLocation?: string | null;
}) {
  const apiKey = env.CALLMEBOT_APIKEY?.trim();
  if (!apiKey) {
    console.warn(
      "[whatsapp] CALLMEBOT_APIKEY missing — skipped business WhatsApp notify"
    );
    return { sent: false as const, reason: "not_configured" };
  }

  const phone = businessWhatsAppDigits(input.ownerWhatsapp);
  if (!phone) {
    console.warn("[whatsapp] No business phone — skipped notify");
    return { sent: false as const, reason: "no_phone" };
  }

  const text = formatReservationWhatsAppText(input);
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[whatsapp] CallMeBot failed:", res.status, body);
      return { sent: false as const, reason: body || `http_${res.status}` };
    }
    console.info("[whatsapp] notify sent →", phone);
    return { sent: true as const };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] notify error:", reason);
    return { sent: false as const, reason };
  }
}
