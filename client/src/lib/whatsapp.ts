import { SITE, businessRuntime } from "../seo/site";

export function whatsappDigits() {
  const raw =
    businessRuntime.whatsapp ||
    businessRuntime.phoneDigits ||
    SITE.phone;
  return String(raw).replace(/[^\d]/g, "") || "355689001257";
}

export function whatsappHref(text: string) {
  return `https://wa.me/${whatsappDigits()}?text=${encodeURIComponent(text)}`;
}

export function carWhatsappText(
  car: { brand: string; model: string; year?: number },
  locale: string
) {
  const label = `${car.brand} ${car.model}${car.year ? ` (${car.year})` : ""}`;
  if (locale === "en") {
    return `Hello Auto Rental — Via Egnatia, I want to book ${label}. Please check availability.`;
  }
  if (locale === "it") {
    return `Salve Auto Rental — Via Egnatia, vorrei prenotare ${label}. Potete confermare la disponibilità?`;
  }
  return `Përshëndetje Auto Rental — Via Egnatia, dua të rezervoj ${label}. A është e lirë?`;
}
