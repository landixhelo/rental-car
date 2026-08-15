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

export function buildReservationWhatsAppUrl(input: {
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
  const phone = businessWhatsAppDigits(input.ownerWhatsapp);
  if (!phone) return null;

  const lines = [
    "Përshëndetje AutoRent,",
    "",
    "Dua të konfirmoj këtë rezervim:",
    input.code ? `• Kodi: ${input.code}` : null,
    `• Klienti: ${input.customerName}`,
    input.customerPhone ? `• Tel: ${input.customerPhone}` : null,
    input.customerEmail ? `• Email: ${input.customerEmail}` : null,
    `• Makina: ${input.carLabel}`,
    `• Datat: ${input.startDate} → ${input.endDate}`,
    input.pickupLocation ? `• Marrja: ${input.pickupLocation}` : null,
    `• Totali: €${input.totalPrice}`,
    `• Pagesa: ${input.paymentMethod}`,
    "",
    "Faleminderit!",
  ].filter((line) => line !== null);

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
